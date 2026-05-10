import AuthGuard from './auth-guard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard>{children}</AuthGuard>
}
