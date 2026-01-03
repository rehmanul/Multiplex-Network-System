/**
 * Multiplex Network - Federal Register API Connector
 * 
 * Production connector for the Federal Register API
 * https://www.federalregister.gov/developers/documentation/api/v1
 * 
 * Retrieves:
 * - Final rules and regulations
 * - Proposed rules
 * - Agency notices
 * - Executive orders
 * - Presidential documents
 */

import { request } from 'undici';
import PQueue from 'p-queue';
import pRetry from 'p-retry';
import { z } from 'zod';
import {
    createPolicyExpression,
    createExecutiveAgency,
    type PolicyExpression,
    type ExecutiveAgency,
    type PolicyExpressionType,
    type PolicyExpressionStatus,
    type AgencyType,
    type DataProvenance,
} from '@multiplex/core';

// ============================================================================
// Configuration
// ============================================================================

export interface FederalRegisterConfig {
    baseUrl?: string;
    rateLimit?: number;
    maxRetries?: number;
    timeout?: number;
}

// ============================================================================
// API Response Schemas
// ============================================================================

const FRDocumentSchema = z.object({
    document_number: z.string(),
    title: z.string(),
    type: z.string(),
    abstract: z.string().nullable().optional(),
    publication_date: z.string(),
    effective_on: z.string().nullable().optional(),
    agencies: z.array(z.object({
        name: z.string(),
        id: z.number().nullable().optional(),
        slug: z.string().nullable().optional(),
        parent_id: z.number().nullable().optional(),
    })),
    cfr_references: z.array(z.object({
        title: z.number(),
        part: z.number().nullable().optional(),
    })).optional(),
    regulation_id_numbers: z.array(z.string()).optional(),
    docket_ids: z.array(z.string()).optional(),
    html_url: z.string(),
    pdf_url: z.string().optional(),
    president: z.object({
        name: z.string(),
        identifier: z.string(),
    }).nullable().optional(),
    executive_order_number: z.number().nullable().optional(),
});

const FRAgencySchema = z.object({
    id: z.number(),
    name: z.string(),
    short_name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    parent_id: z.number().nullable().optional(),
    slug: z.string(),
    logo: z.string().nullable().optional(),
    recent_articles_url: z.string().optional(),
});

// ============================================================================
// Federal Register Connector
// ============================================================================

export class FederalRegisterConnector {
    private baseUrl: string;
    private queue: PQueue;
    private maxRetries: number;
    private timeout: number;

    constructor(config: FederalRegisterConfig = {}) {
        this.baseUrl = config.baseUrl ?? 'https://www.federalregister.gov/api/v1';
        this.maxRetries = config.maxRetries ?? 3;
        this.timeout = config.timeout ?? 30000;

        // Federal Register has generous rate limits
        this.queue = new PQueue({
            intervalCap: config.rateLimit ?? 10,
            interval: 1000,
        });
    }

    // ============================================================================
    // HTTP Client
    // ============================================================================

    private async fetch<T>(
        endpoint: string,
        params: Record<string, string | number | string[]> = {}
    ): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                value.forEach(v => url.searchParams.append(`${key}[]`, v));
            } else {
                url.searchParams.set(key, String(value));
            }
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

                    if (response.statusCode !== 200) {
                        throw new Error(`API error: ${response.statusCode}`);
                    }

                    return (await response.body.json()) as T;
                },
                { retries: this.maxRetries }
            )
        ) as Promise<T>;
    }

    private getProvenance(): DataProvenance {
        return {
            sourceId: 'federal-register-api',
            sourceName: 'Federal Register API',
            sourceUrl: 'https://www.federalregister.gov',
            retrievedAt: new Date(),
            confidence: 1,
        };
    }

    // ============================================================================
    // Documents
    // ============================================================================

    /**
     * Fetch recent documents by type
     */
    async fetchDocuments(options: {
        type?: 'RULE' | 'PRORULE' | 'NOTICE' | 'PRESDOCU';
        perPage?: number;
        page?: number;
        conditions?: {
            agencies?: string[];
            term?: string;
            publication_date?: { gte?: string; lte?: string };
        };
    } = {}): Promise<PolicyExpression[]> {
        const expressions: PolicyExpression[] = [];

        interface DocumentResponse {
            results: Array<z.infer<typeof FRDocumentSchema>>;
            count: number;
            next_page_url: string | null;
        }

        const params: Record<string, string | number | string[]> = {
            per_page: options.perPage ?? 100,
            page: options.page ?? 1,
            order: 'newest',
        };

        if (options.type) {
            params['conditions[type][]'] = options.type;
        }

        if (options.conditions?.agencies) {
            params['conditions[agencies][]'] = options.conditions.agencies;
        }

        if (options.conditions?.term) {
            params['conditions[term]'] = options.conditions.term;
        }

        if (options.conditions?.publication_date?.gte) {
            params['conditions[publication_date][gte]'] = options.conditions.publication_date.gte;
        }

        if (options.conditions?.publication_date?.lte) {
            params['conditions[publication_date][lte]'] = options.conditions.publication_date.lte;
        }

        const response = await this.fetch<DocumentResponse>('/documents.json', params);

        for (const doc of response.results) {
            try {
                const parsed = FRDocumentSchema.parse(doc);
                const expression = this.transformDocument(parsed);
                expressions.push(expression);
            } catch (e) {
                console.warn(`Failed to parse document: ${doc.document_number}`, e);
            }
        }

        return expressions;
    }

    /**
     * Fetch executive orders
     */
    async fetchExecutiveOrders(
        president?: string,
        year?: number
    ): Promise<PolicyExpression[]> {
        const expressions: PolicyExpression[] = [];
        let page = 1;

        console.log('Fetching executive orders...');

        while (true) {
            interface EOResponse {
                results: Array<z.infer<typeof FRDocumentSchema>>;
                count: number;
                next_page_url: string | null;
            }

            const params: Record<string, string | number> = {
                per_page: 100,
                page,
                order: 'executive_order_number',
                'conditions[type][]': 'PRESDOCU',
                'conditions[presidential_document_type][]': 'executive_order',
            };

            if (president) {
                params['conditions[president][]'] = president;
            }

            if (year) {
                params['conditions[publication_date][year]'] = year;
            }

            const response = await this.fetch<EOResponse>('/documents.json', params);

            for (const doc of response.results) {
                try {
                    const parsed = FRDocumentSchema.parse(doc);
                    const expression = this.transformDocument(parsed);
                    expressions.push(expression);
                } catch (e) {
                    console.warn(`Failed to parse EO: ${doc.document_number}`, e);
                }
            }

            console.log(`Fetched ${expressions.length} executive orders`);

            if (!response.next_page_url) break;
            page++;
        }

        return expressions;
    }

    /**
     * Fetch regulations by agency
     */
    async fetchAgencyRegulations(
        agencySlug: string,
        startDate?: string,
        endDate?: string
    ): Promise<PolicyExpression[]> {
        const conditions: Record<string, unknown> = {
            agencies: [agencySlug],
        };

        if (startDate || endDate) {
            conditions['publication_date'] = {
                gte: startDate,
                lte: endDate,
            };
        }

        return this.fetchDocuments({
            type: 'RULE',
            perPage: 1000,
            conditions: conditions as { agencies?: string[]; term?: string; publication_date?: { gte?: string; lte?: string } },
        });
    }

    private transformDocument(data: z.infer<typeof FRDocumentSchema>): PolicyExpression {
        const typeMap: Record<string, PolicyExpressionType> = {
            'Rule': 'REGULATION',
            'Proposed Rule': 'REGULATION',
            'Notice': 'GUIDANCE',
            'Presidential Document': 'EXECUTIVE_ORDER',
        };

        let status: PolicyExpressionStatus = 'FINAL';
        if (data.type === 'Proposed Rule') {
            status = 'PROPOSED';
        }

        let officialId = data.document_number;
        if (data.executive_order_number) {
            officialId = `EO ${data.executive_order_number}`;
        }

        return createPolicyExpression({
            name: data.title,
            description: data.abstract ?? undefined,
            expressionType: typeMap[data.type] ?? 'REGULATION',
            status,
            officialId,
            introducedDate: new Date(data.publication_date),
            metadata: {
                agencies: data.agencies.map(a => a.name),
                cfrReferences: data.cfr_references,
                docketIds: data.docket_ids,
                regulationIds: data.regulation_id_numbers,
                effectiveDate: data.effective_on,
                htmlUrl: data.html_url,
                pdfUrl: data.pdf_url,
                president: data.president?.name,
            },
            provenance: this.getProvenance(),
        });
    }

    // ============================================================================
    // Agencies
    // ============================================================================

    /**
     * Fetch all agencies from Federal Register
     */
    async fetchAgencies(): Promise<ExecutiveAgency[]> {
        const agencies: ExecutiveAgency[] = [];

        interface AgencyResponse {
            results: Array<z.infer<typeof FRAgencySchema>>;
        }

        const response = await this.fetch<AgencyResponse>('/agencies.json');

        for (const agencyData of response.results) {
            try {
                const parsed = FRAgencySchema.parse(agencyData);
                const agency = this.transformAgency(parsed);
                agencies.push(agency);
            } catch (e) {
                console.warn(`Failed to parse agency: ${agencyData.name}`, e);
            }
        }

        console.log(`Fetched ${agencies.length} agencies from Federal Register`);

        return agencies;
    }

    private transformAgency(data: z.infer<typeof FRAgencySchema>): ExecutiveAgency {
        // Determine agency type based on name patterns
        let agencyType: AgencyType = 'INDEPENDENT_AGENCY';

        const name = data.name.toLowerCase();
        if (name.includes('department of')) {
            agencyType = 'CABINET_DEPARTMENT';
        } else if (name.includes('commission')) {
            agencyType = 'REGULATORY_COMMISSION';
        } else if (name.includes('corporation')) {
            agencyType = 'GOVERNMENT_CORPORATION';
        } else if (name.includes('office of the president') || name.includes('executive office')) {
            agencyType = 'EXECUTIVE_OFFICE';
        }

        return createExecutiveAgency({
            name: data.name,
            abbreviation: data.short_name ?? data.slug.toUpperCase(),
            agencyType,
            website: data.url ?? undefined,
            metadata: {
                federalRegisterId: data.id,
                slug: data.slug,
                parentId: data.parent_id,
                logo: data.logo,
            },
            provenance: this.getProvenance(),
        });
    }
}

// ============================================================================
// Factory
// ============================================================================

export function createFederalRegisterConnector(config?: FederalRegisterConfig): FederalRegisterConnector {
    return new FederalRegisterConnector(config);
}
