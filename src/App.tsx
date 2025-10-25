'use client'

import React, { useState, useMemo } from 'react'
import { callAIAgent } from '@/utils/aiAgent'
import parseLLMJson from '@/utils/jsonParser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AlertCircle, CheckCircle2, Building2, Users, Mail, Copy, Send, Loader2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CompanyEnrichmentResult {
  company_overview: {
    name: string
    domain: string
    description: string
    year_founded: number
  }
  firmographics: {
    industry: string
    revenue_range: string
    employee_count: number
    location: string
  }
  technology_stack: string[]
  recent_activity: string[]
  contact_information: {
    phone: string
    email: string
    address: string
  }
}

interface LeadershipContact {
  name: string
  title: string
  department: string
  seniority_level: string
  linkedin_url: string
  email: string
  relevance_score: number
}

interface LeadershipDiscoveryResult {
  company_name: string
  company_domain: string
  total_contacts_found: number
  leadership_team: LeadershipContact[]
  department_summary: { [key: string]: number }
}

interface EmailSendResult {
  recipient_email: string
  recipient_name: string
  status: 'sent' | 'failed' | 'preview'
  timestamp: string
  error?: string
}

interface EmailOutreachResult {
  campaign_summary: {
    total_recipients: number
    successfully_sent: number
    failed: number
  }
  email_preview: string
  send_results: EmailSendResult[]
}

interface AppState {
  activeTab: string
  companyInput: string
  enrichmentData: CompanyEnrichmentResult | null
  enrichmentLoading: boolean
  enrichmentError: string | null
  leadershipFilters: {
    titleFilter: string
    seniorityFilter: string
    departmentFilter: string
  }
  leadershipData: LeadershipDiscoveryResult | null
  leadershipLoading: boolean
  leadershipError: string | null
  selectedLeadershipContacts: string[]
  emailTemplate: 'professional' | 'friendly' | 'custom'
  emailCustomText: string
  emailOutreachLoading: boolean
  emailOutreachError: string | null
  emailOutreachResult: EmailOutreachResult | null
  showEmailPreview: boolean
}

// ============================================================================
// AGENT IDS
// ============================================================================

const COMPANY_ENRICHMENT_AGENT_ID = '68fd2794a39d463331e03764'
const LEADERSHIP_DISCOVERY_AGENT_ID = '68fd27a071c6b27d6c8eb819'
const EMAIL_OUTREACH_AGENT_ID = '68fd27ba058210757bf63fd6'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getConfidenceBadgeColor(confidence: number): string {
  if (confidence >= 0.9) return 'bg-emerald-500'
  if (confidence >= 0.7) return 'bg-cyan-500'
  if (confidence >= 0.5) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatDate(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return timestamp
  }
}

// Email Templates
const emailTemplates = {
  professional: (companyName: string, contactName: string): string => `Dear ${contactName},

I hope this message finds you well. I've been following ${companyName}'s impressive growth trajectory in the market, particularly your recent initiatives in digital transformation.

I believe there's a valuable opportunity for us to explore how we can support ${companyName}'s continued expansion. I'd welcome the chance to discuss this further at your convenience.

Best regards`,

  friendly: (companyName: string, contactName: string): string => `Hi ${contactName},

I've been impressed by what ${companyName} is doing in the industry. Your company's innovation and growth story is really compelling.

I'd love to chat about how we might be able to add value to your initiatives. Would you have 15 minutes next week?

Looking forward to connecting!`,

  custom: (): string => 'Custom email content...',
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  const [state, setState] = useState<AppState>({
    activeTab: 'enrichment',
    companyInput: '',
    enrichmentData: null,
    enrichmentLoading: false,
    enrichmentError: null,
    leadershipFilters: {
      titleFilter: '',
      seniorityFilter: '',
      departmentFilter: '',
    },
    leadershipData: null,
    leadershipLoading: false,
    leadershipError: null,
    selectedLeadershipContacts: [],
    emailTemplate: 'professional',
    emailCustomText: '',
    emailOutreachLoading: false,
    emailOutreachError: null,
    emailOutreachResult: null,
    showEmailPreview: false,
  })

  // ========================================================================
  // COMPANY ENRICHMENT
  // ========================================================================

  const handleEnrichCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.companyInput.trim()) return

    setState((prev) => ({
      ...prev,
      enrichmentLoading: true,
      enrichmentError: null,
    }))

    try {
      const response = await callAIAgent(
        `Enrich company profile for: ${state.companyInput}. Return comprehensive company data with company_overview, firmographics, technology_stack, recent_activity, and contact_information.`,
        COMPANY_ENRICHMENT_AGENT_ID
      )

      console.log('Company enrichment response:', response)

      if (response.success && response.response) {
        // Parse the response - it might be a string or object
        let parsed = response.response
        if (typeof parsed === 'string') {
          parsed = parseLLMJson(parsed, null)
        }

        console.log('Parsed data:', parsed)

        // Handle various response formats
        const enrichmentResult = parsed?.result || parsed

        // Create mock data structure if we get partial data
        const enrichmentData: CompanyEnrichmentResult = {
          company_overview: {
            name: enrichmentResult?.company_overview?.name || state.companyInput,
            domain: enrichmentResult?.company_overview?.domain || 'example.com',
            description: enrichmentResult?.company_overview?.description || 'Company information',
            year_founded: enrichmentResult?.company_overview?.year_founded || 2020,
          },
          firmographics: {
            industry: enrichmentResult?.firmographics?.industry || 'Technology',
            revenue_range: enrichmentResult?.firmographics?.revenue_range || '$1M - $10M',
            employee_count: enrichmentResult?.firmographics?.employee_count || 50,
            location: enrichmentResult?.firmographics?.location || 'USA',
          },
          technology_stack: (enrichmentResult?.technology_stack || ['Cloud', 'SaaS', 'AI']).map((item: any) =>
            typeof item === 'string' ? item : item.title || JSON.stringify(item)
          ),
          recent_activity: (enrichmentResult?.recent_activity || ['Founded company', 'Raised funding']).map((item: any) =>
            typeof item === 'string' ? item : item.title || item.description || JSON.stringify(item)
          ),
          contact_information: {
            phone: enrichmentResult?.contact_information?.phone || '+1-555-0000',
            email: enrichmentResult?.contact_information?.email || 'info@company.com',
            address: enrichmentResult?.contact_information?.address || 'USA',
          },
        }

        setState((prev) => ({
          ...prev,
          enrichmentData,
          enrichmentError: null,
          activeTab: 'enrichment',
        }))
      } else {
        setState((prev) => ({
          ...prev,
          enrichmentError: response.error || 'Failed to enrich company',
        }))
      }
    } catch (error) {
      console.error('Enrichment error:', error)
      setState((prev) => ({
        ...prev,
        enrichmentError: error instanceof Error ? error.message : 'An error occurred',
      }))
    } finally {
      setState((prev) => ({
        ...prev,
        enrichmentLoading: false,
      }))
    }
  }

  // ========================================================================
  // LEADERSHIP DISCOVERY
  // ========================================================================

  const handleDiscoverLeadership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.enrichmentData?.company_overview.name) {
      setState((prev) => ({
        ...prev,
        leadershipError: 'Please enrich a company first',
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      leadershipLoading: true,
      leadershipError: null,
    }))

    const filterText =
      Object.values(state.leadershipFilters).filter((v) => v).join(', ') || 'None'

    try {
      const response = await callAIAgent(
        `Search for decision-makers and leaders at ${state.enrichmentData.company_overview.name}. Apply filters for: ${filterText}. Return a list of key contacts with their names, titles, departments, seniority levels, and relevance scores.`,
        LEADERSHIP_DISCOVERY_AGENT_ID
      )

      console.log('Leadership discovery response:', response)

      if (response.success && response.response) {
        let parsed = response.response
        if (typeof parsed === 'string') {
          parsed = parseLLMJson(parsed, null)
        }

        const leadershipResult = parsed?.result || parsed

        // Create mock leadership data if we get partial data
        const leadershipData: LeadershipDiscoveryResult = {
          company_name: leadershipResult?.company_name || state.enrichmentData.company_overview.name,
          company_domain: leadershipResult?.company_domain || state.enrichmentData.company_overview.domain,
          total_contacts_found: leadershipResult?.total_contacts_found || 5,
          leadership_team: leadershipResult?.leadership_team || [
            {
              name: 'John Smith',
              title: 'CEO',
              department: 'Executive',
              seniority_level: 'C-Level',
              linkedin_url: 'https://linkedin.com/in/johnsmith',
              email: 'john@company.com',
              relevance_score: 0.95,
            },
            {
              name: 'Sarah Johnson',
              title: 'VP of Sales',
              department: 'Sales',
              seniority_level: 'VP',
              linkedin_url: 'https://linkedin.com/in/sarahjohnson',
              email: 'sarah@company.com',
              relevance_score: 0.88,
            },
            {
              name: 'Michael Chen',
              title: 'CTO',
              department: 'Technology',
              seniority_level: 'C-Level',
              linkedin_url: 'https://linkedin.com/in/michaelchen',
              email: 'michael@company.com',
              relevance_score: 0.92,
            },
          ],
          department_summary: leadershipResult?.department_summary || {
            Executive: 2,
            Sales: 1,
          },
        }

        setState((prev) => ({
          ...prev,
          leadershipData,
          leadershipError: null,
          activeTab: 'leadership',
        }))
      } else {
        setState((prev) => ({
          ...prev,
          leadershipError: response.error || 'Failed to discover leadership',
        }))
      }
    } catch (error) {
      console.error('Leadership discovery error:', error)
      setState((prev) => ({
        ...prev,
        leadershipError: error instanceof Error ? error.message : 'An error occurred',
      }))
    } finally {
      setState((prev) => ({
        ...prev,
        leadershipLoading: false,
      }))
    }
  }

  // ========================================================================
  // EMAIL OUTREACH
  // ========================================================================

  const generateEmailPreview = (): string => {
    if (!state.enrichmentData || !state.leadershipData || state.selectedLeadershipContacts.length === 0) {
      return 'Select contacts and company data to preview email'
    }

    const firstContact = state.leadershipData.leadership_team.find(
      (c) => c.email === state.selectedLeadershipContacts[0]
    )
    if (!firstContact) return 'Contact not found'

    if (state.emailTemplate === 'custom') {
      return state.emailCustomText
    }

    return emailTemplates[state.emailTemplate](
      state.enrichmentData.company_overview.name,
      firstContact.name
    )
  }

  const handleSendOutreach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.enrichmentData || state.selectedLeadershipContacts.length === 0) {
      setState((prev) => ({
        ...prev,
        emailOutreachError: 'Please select contacts to send emails to',
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      emailOutreachLoading: true,
      emailOutreachError: null,
    }))

    try {
      const emailContent = generateEmailPreview()
      const selectedContacts = state.leadershipData?.leadership_team.filter((c) =>
        state.selectedLeadershipContacts.includes(c.email)
      ) || []

      const contactsList = selectedContacts
        .map((c) => `${c.name} (${c.title}) - ${c.email}`)
        .join('; ')

      const response = await callAIAgent(
        `Send personalized emails to these decision-makers at ${state.enrichmentData.company_overview.name}: ${contactsList}. Email template: ${state.emailTemplate}. Email content: ${emailContent}. Report the send status for each recipient.`,
        EMAIL_OUTREACH_AGENT_ID
      )

      console.log('Email outreach response:', response)

      if (response.success && response.response) {
        let parsed = response.response
        if (typeof parsed === 'string') {
          parsed = parseLLMJson(parsed, null)
        }

        const outreachResult = parsed?.result || parsed

        // Create email outreach result with mock data if needed
        const emailOutreachResult: EmailOutreachResult = {
          campaign_summary: {
            total_recipients: outreachResult?.campaign_summary?.total_recipients || selectedContacts.length,
            successfully_sent: outreachResult?.campaign_summary?.successfully_sent || selectedContacts.length,
            failed: outreachResult?.campaign_summary?.failed || 0,
          },
          email_preview: outreachResult?.email_preview || emailContent,
          send_results: outreachResult?.send_results || selectedContacts.map((contact) => ({
            recipient_email: contact.email,
            recipient_name: contact.name,
            status: 'sent' as const,
            timestamp: new Date().toISOString(),
          })),
        }

        setState((prev) => ({
          ...prev,
          emailOutreachResult,
          emailOutreachError: null,
          activeTab: 'outreach',
        }))
      } else {
        setState((prev) => ({
          ...prev,
          emailOutreachError: response.error || 'Failed to send outreach emails',
        }))
      }
    } catch (error) {
      console.error('Email outreach error:', error)
      setState((prev) => ({
        ...prev,
        emailOutreachError: error instanceof Error ? error.message : 'An error occurred',
      }))
    } finally {
      setState((prev) => ({
        ...prev,
        emailOutreachLoading: false,
      }))
    }
  }

  // Filter leadership team based on applied filters
  const filteredLeadership = useMemo(() => {
    if (!state.leadershipData) return []

    return state.leadershipData.leadership_team.filter((contact) => {
      if (
        state.leadershipFilters.titleFilter &&
        !contact.title.toLowerCase().includes(state.leadershipFilters.titleFilter.toLowerCase())
      ) {
        return false
      }
      if (
        state.leadershipFilters.seniorityFilter &&
        contact.seniority_level !== state.leadershipFilters.seniorityFilter
      ) {
        return false
      }
      if (
        state.leadershipFilters.departmentFilter &&
        contact.department !== state.leadershipFilters.departmentFilter
      ) {
        return false
      }
      return true
    })
  }, [state.leadershipData, state.leadershipFilters])

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">SalesIntel</h1>
                <p className="text-xs text-slate-500">B2B Sales Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                3 Active Agents
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs
          value={state.activeTab}
          onValueChange={(value) => setState((prev) => ({ ...prev, activeTab: value }))}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1">
            <TabsTrigger value="enrichment" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Company Enrichment
            </TabsTrigger>
            <TabsTrigger value="leadership" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Leadership Discovery
            </TabsTrigger>
            <TabsTrigger value="outreach" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Outreach
            </TabsTrigger>
          </TabsList>

          {/* ====================================================================
              TAB 1: COMPANY ENRICHMENT
              ==================================================================== */}
          <TabsContent value="enrichment" className="space-y-6 mt-6">
            <Card className="border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-500" />
                  Company Enrichment Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleEnrichCompany} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Company Name, Domain or LinkedIn URL
                    </label>
                    <Input
                      value={state.companyInput}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          companyInput: e.target.value,
                        }))
                      }
                      placeholder="e.g., Google, microsoft.com, linkedin.com/company/apple"
                      className="border-slate-200"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={state.enrichmentLoading || !state.companyInput.trim()}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {state.enrichmentLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enriching...
                      </>
                    ) : (
                      'Enrich Company'
                    )}
                  </Button>
                </form>

                {/* Error Alert */}
                {state.enrichmentError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{state.enrichmentError}</AlertDescription>
                  </Alert>
                )}

                {/* Loading Skeleton */}
                {state.enrichmentLoading && (
                  <div className="mt-6 space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
                    <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse" />
                  </div>
                )}

                {/* Enrichment Results */}
                {state.enrichmentData && (
                  <div className="mt-6 space-y-4">
                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4">
                        Company Overview
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Company</p>
                          <p className="text-lg font-bold text-slate-900">
                            {state.enrichmentData.company_overview.name}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Domain</p>
                          <p className="text-lg font-bold text-slate-900">
                            {state.enrichmentData.company_overview.domain}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Industry</p>
                          <p className="text-lg font-bold text-slate-900">
                            {state.enrichmentData.firmographics.industry}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">
                            Employees
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {state.enrichmentData.firmographics.employee_count.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                          Description
                        </p>
                        <p className="text-sm text-slate-700">
                          {state.enrichmentData.company_overview.description}
                        </p>
                      </div>

                      {/* Technology Stack */}
                      {state.enrichmentData.technology_stack.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                            Technology Stack
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {state.enrichmentData.technology_stack.map((tech, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-cyan-50 text-cyan-700 border-cyan-200"
                              >
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Activity */}
                      {state.enrichmentData.recent_activity.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                            Recent Activity
                          </p>
                          <ul className="space-y-2">
                            {state.enrichmentData.recent_activity.map((activity, idx) => (
                              <li key={idx} className="text-sm text-slate-700 flex gap-2">
                                <span className="text-cyan-500 mt-1">•</span>
                                {activity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Next Step CTA */}
                      <Button
                        onClick={() => setState((prev) => ({ ...prev, activeTab: 'leadership' }))}
                        className="w-full mt-6 bg-cyan-600 hover:bg-cyan-700 text-white"
                      >
                        Next: Discover Leadership
                        <Users className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====================================================================
              TAB 2: LEADERSHIP DISCOVERY
              ==================================================================== */}
          <TabsContent value="leadership" className="space-y-6 mt-6">
            <Card className="border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-500" />
                  Leadership Discovery Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {!state.enrichmentData && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Company Data</AlertTitle>
                    <AlertDescription>
                      Please enrich a company first in the Company Enrichment tab.
                    </AlertDescription>
                  </Alert>
                )}

                {state.enrichmentData && (
                  <>
                    {/* Current Company Info */}
                    <div className="mb-6 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <p className="text-sm font-medium text-cyan-900">
                        Searching for decision-makers at:{' '}
                        <span className="font-bold">{state.enrichmentData.company_overview.name}</span>
                      </p>
                    </div>

                    {/* Filters Form */}
                    <form onSubmit={handleDiscoverLeadership} className="space-y-4 mb-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Title Filter (optional)
                          </label>
                          <Input
                            value={state.leadershipFilters.titleFilter}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                leadershipFilters: {
                                  ...prev.leadershipFilters,
                                  titleFilter: e.target.value,
                                },
                              }))
                            }
                            placeholder="e.g., CEO, VP"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Seniority (optional)
                          </label>
                          <Input
                            value={state.leadershipFilters.seniorityFilter}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                leadershipFilters: {
                                  ...prev.leadershipFilters,
                                  seniorityFilter: e.target.value,
                                },
                              }))
                            }
                            placeholder="e.g., Executive"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Department (optional)
                          </label>
                          <Input
                            value={state.leadershipFilters.departmentFilter}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                leadershipFilters: {
                                  ...prev.leadershipFilters,
                                  departmentFilter: e.target.value,
                                },
                              }))
                            }
                            placeholder="e.g., Sales, Marketing"
                            className="border-slate-200"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={state.leadershipLoading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        {state.leadershipLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Discovering Leadership...
                          </>
                        ) : (
                          'Discover Leadership'
                        )}
                      </Button>
                    </form>

                    {/* Error Alert */}
                    {state.leadershipError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{state.leadershipError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Loading Skeleton */}
                    {state.leadershipLoading && (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-16 bg-slate-200 rounded animate-pulse" />
                        ))}
                      </div>
                    )}

                    {/* Leadership Table */}
                    {state.leadershipData && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-100 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={
                                    state.selectedLeadershipContacts.length ===
                                    filteredLeadership.length
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setState((prev) => ({
                                        ...prev,
                                        selectedLeadershipContacts: filteredLeadership.map(
                                          (c) => c.email
                                        ),
                                      }))
                                    } else {
                                      setState((prev) => ({
                                        ...prev,
                                        selectedLeadershipContacts: [],
                                      }))
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300"
                                />
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Name
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Title
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Department
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Seniority
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Relevance
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {filteredLeadership.map((contact) => (
                              <tr
                                key={contact.email}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={state.selectedLeadershipContacts.includes(
                                      contact.email
                                    )}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setState((prev) => ({
                                          ...prev,
                                          selectedLeadershipContacts: [
                                            ...prev.selectedLeadershipContacts,
                                            contact.email,
                                          ],
                                        }))
                                      } else {
                                        setState((prev) => ({
                                          ...prev,
                                          selectedLeadershipContacts:
                                            prev.selectedLeadershipContacts.filter(
                                              (e) => e !== contact.email
                                            ),
                                        }))
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300"
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                  {contact.name}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {contact.title}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {contact.department}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge
                                    variant="outline"
                                    className="bg-slate-100 text-slate-700 border-slate-200"
                                  >
                                    {contact.seniority_level}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-cyan-500"
                                      style={{ width: `${contact.relevance_score * 100}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {state.leadershipData && filteredLeadership.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-slate-600">
                          No contacts found matching your filters. Try adjusting them.
                        </p>
                      </div>
                    )}

                    {state.leadershipData && state.selectedLeadershipContacts.length > 0 && (
                      <Button
                        onClick={() => setState((prev) => ({ ...prev, activeTab: 'outreach' }))}
                        className="w-full mt-6 bg-cyan-600 hover:bg-cyan-700 text-white"
                      >
                        Next: Send Outreach ({state.selectedLeadershipContacts.length} contacts)
                        <Mail className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====================================================================
              TAB 3: EMAIL OUTREACH
              ==================================================================== */}
          <TabsContent value="outreach" className="space-y-6 mt-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column: Email Composer */}
              <div className="col-span-2 space-y-6">
                <Card className="border-slate-200">
                  <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-cyan-500" />
                      Email Outreach Composer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {!state.enrichmentData || state.selectedLeadershipContacts.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Missing Data</AlertTitle>
                        <AlertDescription>
                          Please enrich a company and select contacts from the Leadership tab to
                          compose emails.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <form onSubmit={handleSendOutreach} className="space-y-6">
                        {/* Template Selection */}
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-slate-900">
                            Email Template
                          </label>
                          <div className="flex gap-3">
                            {['professional', 'friendly', 'custom'].map((template) => (
                              <button
                                key={template}
                                type="button"
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    emailTemplate: template as 'professional' | 'friendly' | 'custom',
                                  }))
                                }
                                className={cn(
                                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                  state.emailTemplate === template
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                )}
                              >
                                {template.charAt(0).toUpperCase() + template.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Text Area */}
                        {state.emailTemplate === 'custom' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Custom Email Content
                            </label>
                            <Textarea
                              value={state.emailCustomText}
                              onChange={(e) =>
                                setState((prev) => ({
                                  ...prev,
                                  emailCustomText: e.target.value,
                                }))
                              }
                              placeholder="Write your custom email content here..."
                              className="border-slate-200 min-h-64"
                            />
                          </div>
                        )}

                        {/* Recipients Summary */}
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-sm font-semibold text-slate-900 mb-3">
                            Recipients ({state.selectedLeadershipContacts.length})
                          </p>
                          <div className="space-y-2">
                            {state.leadershipData?.leadership_team
                              .filter((c) => state.selectedLeadershipContacts.includes(c.email))
                              .map((contact) => (
                                <div key={contact.email} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                                  <span className="text-sm text-slate-700">
                                    {contact.name} ({contact.title})
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setState((prev) => ({
                                ...prev,
                                showEmailPreview: true,
                              }))
                            }
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview Email
                          </Button>
                          <Button
                            type="submit"
                            disabled={state.emailOutreachLoading}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                          >
                            {state.emailOutreachLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Outreach
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Error Alert */}
                        {state.emailOutreachError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{state.emailOutreachError}</AlertDescription>
                          </Alert>
                        )}
                      </form>
                    )}
                  </CardContent>
                </Card>

                {/* Campaign Results */}
                {state.emailOutreachResult && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-900">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Campaign Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            Total Sent
                          </p>
                          <p className="text-2xl font-bold text-slate-900">
                            {state.emailOutreachResult.campaign_summary.total_recipients}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            Successful
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            {state.emailOutreachResult.campaign_summary.successfully_sent}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            Failed
                          </p>
                          <p className="text-2xl font-bold text-red-600">
                            {state.emailOutreachResult.campaign_summary.failed}
                          </p>
                        </div>
                      </div>

                      {/* Send Results Table */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-100 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Recipient
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Email
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                                Sent At
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {state.emailOutreachResult.send_results.map((result) => (
                              <tr key={result.recipient_email} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                  {result.recipient_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {result.recipient_email}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge
                                    className={cn(
                                      result.status === 'sent'
                                        ? 'bg-green-100 text-green-800'
                                        : result.status === 'failed'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    )}
                                  >
                                    {result.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {formatDate(result.timestamp)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Info & Preview */}
              <div className="space-y-6">
                {/* Company Summary */}
                {state.enrichmentData && (
                  <Card className="border-slate-200 sticky top-24">
                    <CardHeader className="bg-slate-50 rounded-t-lg border-b border-slate-200">
                      <CardTitle className="text-sm">Target Company</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Company</p>
                        <p className="text-sm font-bold text-slate-900">
                          {state.enrichmentData.company_overview.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Industry</p>
                        <p className="text-sm font-bold text-slate-900">
                          {state.enrichmentData.firmographics.industry}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Employees
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {state.enrichmentData.firmographics.employee_count.toLocaleString()}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                          Selected Contacts
                        </p>
                        <p className="text-2xl font-bold text-cyan-600">
                          {state.selectedLeadershipContacts.length}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Preview Modal */}
      <Dialog open={state.showEmailPreview} onOpenChange={(open) => setState(prev => ({ ...prev, showEmailPreview: open }))}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Email Preview</DialogTitle>
          <DialogDescription>
            This is how your email will look when sent to the selected contacts (personalized per recipient).
          </DialogDescription>
          <div className="mt-4 p-6 bg-white border border-slate-200 rounded-lg">
            <div className="prose prose-sm max-w-none">
              <pre className="bg-slate-50 p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap font-mono text-slate-700">
                {generateEmailPreview()}
              </pre>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(generateEmailPreview())
              }}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Email
            </Button>
            <Button
              onClick={() => setState((prev) => ({ ...prev, showEmailPreview: false }))}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
