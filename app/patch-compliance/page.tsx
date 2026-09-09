import { AppShell } from '@/components/shell/app-shell'
import { PatchCompliancePage } from '@/components/pages/patch-compliance'

export const metadata = { title: 'OS Updates — Fleet Compliance' }

export default function Page() {
  return (
    <AppShell>
      <PatchCompliancePage />
    </AppShell>
  )
}
