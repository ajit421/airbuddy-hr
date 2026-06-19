import type { GetServerSideProps } from 'next'

// Root route — immediately redirect to dashboard.
// AuthGuard on dashboard will redirect to /login if not authenticated.
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dashboard',
      permanent: false,
    },
  }
}

export default function IndexPage() {
  return null
}

