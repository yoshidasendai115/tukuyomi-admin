import { redirect } from 'next/navigation';

export default function AdminPage() {
  // /adminへのアクセスは/admin/dashboardにリダイレクト
  redirect('/admin/dashboard');
}