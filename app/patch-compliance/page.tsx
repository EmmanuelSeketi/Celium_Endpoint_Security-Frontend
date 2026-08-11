import { AppShell } from '@/components/shell/app-shell'
import { PatchCompliancePage } from '@/components/pages/patch-compliance'

export const metadata = { title: 'Patch Compliance — Fleet Compliance' }

export default function Page() {
  return (
    <AppShell>
      <PatchCompliancePage />
    </AppShell>
  )
}
