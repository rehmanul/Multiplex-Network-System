/**
 * Multiplex Network - Congress.gov API Connector
 * 
 * Production connector for the official Congress.gov API
 * https://api.congress.gov/
 * 
 * Retrieves:
 * - Members of Congress (current and historical)
 * - Committees and subcommittees
 * - Bills, resolutions, amendments
 * - Voting records
 */

import { request } from 'undici';
import PQueue from 'p-queue';
import pRetry from 'p-retry';
import { z } from 'zod';
import {
    createCongressMember,
    createCommittee,
    createSubcommittee,
    createPolicyExpression,
    type CongressMember,
    type Committee,
    type Subcommittee,
    type PolicyExpression,
    type Party,
    type Chamber,
    type CommitteeType,
    type PolicyExpressionType,
    type PolicyExpressionStatus,
    type DataProvenance,
} from '@multiplex/core';

// ============================================================================
// Configuration
// ============================================================================

export interface CongressConnectorConfig {
    apiKey: string;
    baseUrl?: string;
    rateLimit?: number; // requests per second
    maxRetries?: number;
    timeout?: number;
}

// ============================================================================
// API Response Schemas
// ============================================================================

const CongressApiMemberSchema = z.object({
    bioguideId: z.string(),
    name: z.string(),
    partyName: z.string(),
    state: z.string(),
    district: z.number().nullable().optional(),
    terms: z.array(z.object({
        chamber: z.string(),
        startYear: z.number(),
        endYear: z.number().nullable().optional(),
    })).optional(),
    depiction: z.object({
        imageUrl: z.string().optional(),
    }).optional(),
    officialWebsiteUrl: z.string().optional(),
    directOrderName: z.string().optional(),
});

const CongressApiCommitteeSchema = z.object({
    systemCode: z.string(),
    name: z.string(),
    chamber: z.string(),
    committeeTypeCode: z.string(),
    parent: z.object({
        systemCode: z.string(),
        name: z.string(),
    }).nullable().optional(),
    subcommittees: z.array(z.object({
        systemCode: z.string(),
        name: z.string(),
    })).optional(),
    url: z.string().optional(),
});

const CongressApiBillSchema = z.object({
    congress: z.number(),
    type: z.string(),
    number: z.number(),
    title: z.string(),
    originChamber: z.string(),
    introducedDate: z.string(),
    latestAction: z.object({
        actionDate: z.string(),
        text: z.string(),
    }).optional(),
    policyArea: z.object({
        name: z.string(),
    }).nullable().optional(),
    sponsors: z.array(z.object({
        bioguideId: z.string(),
    })).optional(),
    cosponsors: z.object({
        count: z.number(),
    }).optional(),
});

// ============================================================================
// Congress Connector
// ============================================================================

export class CongressConnector {
    private apiKey: string;
    private baseUrl: string;
    private queue: PQueue;
    private maxRetries: number;
    private timeout: number;

    constructor(config: CongressConnectorConfig) {
        if (!config.apiKey) {
            throw new Error('Congress.gov API key is required. Get one at https://api.congress.gov/sign-up/');
        }

        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl ?? 'https://api.congress.gov/v3';
        this.maxRetries = config.maxRetries ?? 3;
        this.timeout = config.timeout ?? 30000;

        // Congress.gov rate limit: 5000 requests/hour = ~1.4/second
        this.queue = new PQueue({
            intervalCap: config.rateLimit ?? 1,
            interval: 1000,
            carryoverConcurrencyCount: true,
        });
    }

    // ============================================================================
    // HTTP Client
    // ============================================================================

    private async fetch<T>(
        endpoint: string,
        params: Record<string, string | number> = {}
    ): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.set('api_key', this.apiKey);
        url.searchParams.set('format', 'json');

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, String(value));
        }

        return this.queue.add(() =>
            pRetry(
                async () => {
                    const response = await request(url.toString(), {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        },
                        bodyTimeout: this.timeout,
                        headersTimeout: this.timeout,
                    });

                    if (response.statusCode === 429) {
                        throw new Error('Rate limited');
                    }

                    if (response.statusCode !== 200) {
                        throw new Error(`API error: ${response.statusCode}`);
                    }

                    const data = await response.body.json();
                    return data as T;
                },
                { retries: this.maxRetries }
            )
        ) as Promise<T>;
    }

    private getProvenance(): DataProvenance {
        return {
            sourceId: 'congress-gov-api',
            sourceName: 'Congress.gov API',
            sourceUrl: 'https://api.congress.gov',
            retrievedAt: new Date(),
            confidence: 1,
        };
    }

    // ============================================================================
    // Members
    // ============================================================================

    /**
     * Fetch all current members of Congress
     */
    async fetchCurrentMembers(): Promise<CongressMember[]> {
        const members: CongressMember[] = [];
        let offset = 0;
        const limit = 250;

        console.log('Fetching current members of Congress...');

        while (true) {
            interface MemberResponse {
                members: Array<z.infer<typeof CongressApiMemberSchema>>;
                pagination: { count: number; next?: string };
            }

            const response = await this.fetch<MemberResponse>('/member', {
                limit,
                offset,
                currentMember: 'true',
            });

            for (const memberData of response.members) {
                try {
                    const parsed = CongressApiMemberSchema.parse(memberData);
                    const member = this.transformMember(parsed);
                    members.push(member);
                } catch (e) {
                    console.warn(`Failed to parse member: ${memberData.bioguideId}`, e);
                }
            }

            console.log(`Fetched ${members.length} / ${response.pagination.count} members`);

            if (!response.pagination.next || members.length >= response.pagination.count) {
                break;
            }

            offset += limit;
        }

        return members;
    }

    /**
     * Fetch a specific member by Bioguide ID
     */
    async fetchMember(bioguideId: string): Promise<CongressMember | null> {
        try {
            interface SingleMemberResponse {
                member: z.infer<typeof CongressApiMemberSchema>;
            }

            const response = await this.fetch<SingleMemberResponse>(`/member/${bioguideId}`);
            const parsed = CongressApiMemberSchema.parse(response.member);
            return this.transformMember(parsed);
        } catch {
            return null;
        }
    }

    private transformMember(data: z.infer<typeof CongressApiMemberSchema>): CongressMember {
        const currentTerm = data.terms?.[data.terms.length - 1];
        const chamber: Chamber = currentTerm?.chamber === 'Senate' ? 'SENATE' : 'HOUSE';

        const partyMap: Record<string, Party> = {
            'Democratic': 'DEMOCRAT',
            'Republican': 'REPUBLICAN',
            'Independent': 'INDEPENDENT',
        };

        return createCongressMember({
            name: data.name,
            bioguideId: data.bioguideId,
            party: partyMap[data.partyName] ?? 'OTHER',
            state: data.state,
            chamber,
            district: data.district ?? undefined,
            termStart: new Date(currentTerm?.startYear ?? new Date().getFullYear(), 0, 1),
            termEnd: currentTerm?.endYear ? new Date(currentTerm.endYear, 11, 31) : undefined,
            previousTerms: (data.terms ?? []).slice(0, -1).map(t => ({
                congress: 0, // Would need separate lookup
                chamber: t.chamber === 'Senate' ? 'SENATE' as const : 'HOUSE' as const,
                termStart: new Date(t.startYear, 0, 1),
                termEnd: new Date(t.endYear ?? new Date().getFullYear(), 11, 31),
            })),
            metadata: {
                imageUrl: data.depiction?.imageUrl,
                website: data.officialWebsiteUrl,
            },
            provenance: this.getProvenance(),
        });
    }

    // ============================================================================
    // Committees
    // ============================================================================

    /**
     * Fetch all current committees
     */
    async fetchCommittees(congress?: number): Promise<{ committees: Committee[]; subcommittees: Subcommittee[] }> {
        const committees: Committee[] = [];
        const subcommittees: Subcommittee[] = [];
        const currentCongress = congress ?? this.getCurrentCongress();

        console.log(`Fetching committees for Congress ${currentCongress}...`);

        for (const chamber of ['house', 'senate', 'joint']) {
            interface CommitteeResponse {
                committees: Array<z.infer<typeof CongressApiCommitteeSchema>>;
            }

            const response = await this.fetch<CommitteeResponse>(
                `/committee/${chamber}`,
                { congress: currentCongress }
            );

            for (const committeeData of response.committees) {
                try {
                    const parsed = CongressApiCommitteeSchema.parse(committeeData);

                    if (parsed.parent) {
                        // This is a subcommittee
                        const sub = this.transformSubcommittee(parsed);
                        subcommittees.push(sub);
                    } else {
                        const com = this.transformCommittee(parsed);
                        committees.push(com);
                    }
                } catch (e) {
                    console.warn(`Failed to parse committee: ${committeeData.systemCode}`, e);
                }
            }
        }

        console.log(`Fetched ${committees.length} committees, ${subcommittees.length} subcommittees`);

        return { committees, subcommittees };
    }

    private transformCommittee(data: z.infer<typeof CongressApiCommitteeSchema>): Committee {
        const chamberMap: Record<string, Committee['chamber']> = {
            'House': 'HOUSE',
            'Senate': 'SENATE',
            'Joint': 'JOINT',
        };

        const typeMap: Record<string, CommitteeType> = {
            'Standing': 'STANDING',
            'Select': 'SELECT',
            'Special': 'SPECIAL',
            'Joint': 'JOINT',
        };

        return createCommittee({
            name: data.name,
            thomasId: data.systemCode,
            systemCode: data.systemCode,
            chamber: chamberMap[data.chamber] ?? 'HOUSE',
            committeeType: typeMap[data.committeeTypeCode] ?? 'STANDING',
            website: data.url,
            provenance: this.getProvenance(),
        });
    }

    private transformSubcommittee(data: z.infer<typeof CongressApiCommitteeSchema>): Subcommittee {
        return createSubcommittee({
            name: data.name,
            systemCode: data.systemCode,
            parentCommitteeId: '', // Will be resolved during import
            parentCommitteeCode: data.parent?.systemCode ?? '',
            provenance: this.getProvenance(),
        });
    }

    // ============================================================================
    // Bills
    // ============================================================================

    /**
     * Fetch bills from a specific Congress
     */
    async fetchBills(
        congress?: number,
        limit = 250
    ): Promise<PolicyExpression[]> {
        const bills: PolicyExpression[] = [];
        const currentCongress = congress ?? this.getCurrentCongress();
        let offset = 0;

        console.log(`Fetching bills for Congress ${currentCongress}...`);

        while (bills.length < limit) {
            interface BillResponse {
                bills: Array<z.infer<typeof CongressApiBillSchema>>;
                pagination: { count: number; next?: string };
            }

            const response = await this.fetch<BillResponse>('/bill', {
                congress: currentCongress,
                limit: Math.min(250, limit - bills.length),
                offset,
            });

            for (const billData of response.bills) {
                try {
                    const parsed = CongressApiBillSchema.parse(billData);
                    const bill = this.transformBill(parsed);
                    bills.push(bill);
                } catch (e) {
                    console.warn(`Failed to parse bill`, e);
                }
            }

            console.log(`Fetched ${bills.length} bills`);

            if (!response.pagination.next || response.bills.length === 0) {
                break;
            }

            offset += 250;
        }

        return bills;
    }

    private transformBill(data: z.infer<typeof CongressApiBillSchema>): PolicyExpression {
        const typeMap: Record<string, PolicyExpressionType> = {
            'HR': 'BILL',
            'S': 'BILL',
            'HJRES': 'RESOLUTION',
            'SJRES': 'RESOLUTION',
            'HCONRES': 'RESOLUTION',
            'SCONRES': 'RESOLUTION',
            'HRES': 'RESOLUTION',
            'SRES': 'RESOLUTION',
        };

        // Determine status from latest action
        let status: PolicyExpressionStatus = 'INTRODUCED';
        const actionText = data.latestAction?.text?.toLowerCase() ?? '';

        if (actionText.includes('became public law') || actionText.includes('signed by president')) {
            status = 'ENACTED';
        } else if (actionText.includes('passed house') && actionText.includes('passed senate')) {
            status = 'PASSED_BOTH';
        } else if (actionText.includes('passed house') || actionText.includes('passed senate')) {
            status = 'PASSED_CHAMBER';
        } else if (actionText.includes('referred to')) {
            status = 'IN_COMMITTEE';
        }

        return createPolicyExpression({
            name: data.title,
            expressionType: typeMap[data.type] ?? 'BILL',
            status,
            officialId: `${data.type}${data.number}`,
            congress: data.congress,
            introducedDate: new Date(data.introducedDate),
            sponsors: data.sponsors?.map(s => s.bioguideId) ?? [],
            metadata: {
                originChamber: data.originChamber,
                policyArea: data.policyArea?.name,
                cosponsorsCount: data.cosponsors?.count,
            },
            provenance: this.getProvenance(),
        });
    }

    // ============================================================================
    // Helpers
    // ============================================================================

    private getCurrentCongress(): number {
        const year = new Date().getFullYear();
        return Math.floor((year - 1789) / 2) + 1;
    }
}

// ============================================================================
// Factory
// ============================================================================

export function createCongressConnector(config?: Partial<CongressConnectorConfig>): CongressConnector {
    const apiKey = config?.apiKey ?? process.env['CONGRESS_API_KEY'];

    if (!apiKey) {
        throw new Error(
            'Congress.gov API key is required. Set CONGRESS_API_KEY environment variable or pass apiKey in config. ' +
            'Get a free API key at https://api.congress.gov/sign-up/'
        );
    }

    return new CongressConnector({ apiKey, ...config });
}
