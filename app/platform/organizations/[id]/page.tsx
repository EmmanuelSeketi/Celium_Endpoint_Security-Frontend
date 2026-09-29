import { PlatformOrganizationDetailPage } from '@/components/pages/platform-organization-detail'
import { AppShell } from '@/components/shell/app-shell'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AppShell><PlatformOrganizationDetailPage id={id} /></AppShell>
}
