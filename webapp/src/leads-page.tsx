import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leadStatusSchema, type LeadStatus } from '@coldpilot/contracts'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Typography } from '@/components/ui/typography'
import { useAuth } from '@/lib/use-auth'

const leadStatuses = leadStatusSchema.options

const leadListsKey = ['leads', 'lists'] as const
const leadsKey = (listId: string) => ['leads', 'list', listId] as const

export function LeadsPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  const listsQuery = useQuery({
    queryKey: leadListsKey,
    enabled: Boolean(auth.user),
    queryFn: async () => (await auth.api.listLeadLists()).leadLists,
  })

  const createList = useMutation({
    mutationFn: (input: { name: string; query: string; targetIndustry?: string }) =>
      auth.api.createLeadList(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: leadListsKey })
      setSelectedListId(result.leadList.id)
    },
  })

  if (auth.isBootstrapping) {
    return <LoadingState />
  }

  if (!auth.user) {
    return (
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16">
        <Badge variant="outline" className="w-fit">
          Protected
        </Badge>
        <Typography variant="h1">Login required</Typography>
        <Typography className="max-w-2xl" tone="muted">
          Sign in to build target lists of businesses and queue them for the AI caller.
        </Typography>
        <Button asChild size="lg" className="w-fit">
          <Link to="/">Go to auth</Link>
        </Button>
      </section>
    )
  }

  const selectedList = listsQuery.data?.find((list) => list.id === selectedListId) ?? null

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-12 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <div className="grid gap-1">
          <Typography variant="h4">Target lists</Typography>
          <Typography variant="bodySm" tone="muted">
            Each list is a segment of businesses to cold-call.
          </Typography>
        </div>

        <CreateListForm
          isPending={createList.isPending}
          error={createList.error}
          onSubmit={(input) => createList.mutate(input)}
        />

        <Separator />

        {listsQuery.isPending ? (
          <Spinner />
        ) : listsQuery.data && listsQuery.data.length > 0 ? (
          <ul className="grid gap-2">
            {listsQuery.data.map((list) => (
              <li key={list.id}>
                <button
                  type="button"
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                    list.id === selectedListId
                      ? 'border-primary bg-secondary'
                      : 'border-border hover:bg-muted/60'
                  }`}
                >
                  <Typography variant="bodySmMedium">
                    {list.name}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {list.targetIndustry} · {list.leadCount} leads · {list.status}
                  </Typography>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Typography variant="bodySm" tone="muted">
            No lists yet. Create your first target segment above.
          </Typography>
        )}
      </div>

      <div className="grid content-start gap-4">
        {selectedList ? (
          <ListDetail listId={selectedList.id} listName={selectedList.name} listQuery={selectedList.query} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select a list</CardTitle>
              <CardDescription>
                Pick a target list to see its businesses, add new ones, and track call status.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </section>
  )
}

function CreateListForm({
  isPending,
  error,
  onSubmit,
}: {
  isPending: boolean
  error: unknown
  onSubmit: (input: { name: string; query: string; targetIndustry?: string }) => void
}) {
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [targetIndustry, setTargetIndustry] = useState('B2B SaaS')

  return (
    <form
      className="grid gap-3 rounded-2xl border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim() || !query.trim()) return
        onSubmit({ name: name.trim(), query: query.trim(), targetIndustry: targetIndustry.trim() })
        setName('')
        setQuery('')
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="list-name">List name</Label>
        <Input
          id="list-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="US SaaS founders"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="list-query">Who are we targeting?</Label>
        <Textarea
          id="list-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="B2B SaaS companies in the US with 11-50 employees"
          rows={2}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="list-industry">Industry</Label>
        <Input
          id="list-industry"
          value={targetIndustry}
          onChange={(event) => setTargetIndustry(event.target.value)}
        />
      </div>
      {error ? (
        <Typography variant="caption" tone="destructive">
          {error instanceof Error ? error.message : 'Could not create the list'}
        </Typography>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create list'}
      </Button>
    </form>
  )
}

function ListDetail({
  listId,
  listName,
  listQuery,
}: {
  listId: string
  listName: string
  listQuery: string
}) {
  const auth = useAuth()
  const queryClient = useQueryClient()

  const leadsQuery = useQuery({
    queryKey: leadsKey(listId),
    queryFn: async () => (await auth.api.listLeads(listId)).leads,
  })

  const addLead = useMutation({
    mutationFn: (input: { companyName: string; phone?: string; website?: string; city?: string }) =>
      auth.api.addLeads(listId, { leads: [input] }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadsKey(listId) })
      void queryClient.invalidateQueries({ queryKey: leadListsKey })
    },
  })

  const updateStatus = useMutation({
    mutationFn: (input: { leadId: string; status: LeadStatus }) =>
      auth.api.updateLeadStatus(input.leadId, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadsKey(listId) })
    },
  })

  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <Typography variant="h3">{listName}</Typography>
        <Typography variant="bodySm" tone="muted">
          {listQuery}
        </Typography>
      </div>

      <form
        className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          if (!companyName.trim()) return
          addLead.mutate({
            companyName: companyName.trim(),
            phone: phone.trim() || undefined,
            website: website.trim() || undefined,
            city: city.trim() || undefined,
          })
          setCompanyName('')
          setPhone('')
          setWebsite('')
          setCity('')
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="lead-company">Company</Label>
          <Input
            id="lead-company"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Acme Cloud"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lead-phone">Phone</Label>
          <Input
            id="lead-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+1 415 555 0142"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lead-website">Website</Label>
          <Input
            id="lead-website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://acme.example"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lead-city">City</Label>
          <Input
            id="lead-city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="San Francisco"
          />
        </div>
        <Button type="submit" disabled={addLead.isPending}>
          Add
        </Button>
      </form>

      {addLead.error ? (
        <Typography variant="caption" tone="destructive">
          {addLead.error instanceof Error ? addLead.error.message : 'Could not add the business'}
        </Typography>
      ) : null}

      {leadsQuery.isPending ? (
        <Spinner />
      ) : leadsQuery.data && leadsQuery.data.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsQuery.data.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Typography variant="bodySmMedium">
                      {lead.companyName}
                    </Typography>
                    {lead.website ? (
                      <Typography variant="caption" tone="muted">
                        {lead.website}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{lead.phone ?? '—'}</TableCell>
                  <TableCell>{[lead.city, lead.country].filter(Boolean).join(', ') || '—'}</TableCell>
                  <TableCell>
                    <NativeSelect
                      size="sm"
                      value={lead.status}
                      disabled={updateStatus.isPending}
                      onChange={(event) =>
                        updateStatus.mutate({
                          leadId: lead.id,
                          status: event.target.value as LeadStatus,
                        })
                      }
                    >
                      {leadStatuses.map((status) => (
                        <NativeSelectOption key={status} value={status}>
                          {status}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Typography variant="bodySm" tone="muted">
          No businesses in this list yet. Add one above, or import a batch via the API.
        </Typography>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16">
      <Card className="w-fit">
        <CardContent className="flex items-center gap-3">
          <Spinner />
          <Typography variant="bodySm" tone="muted">
            Checking session...
          </Typography>
        </CardContent>
      </Card>
    </section>
  )
}
