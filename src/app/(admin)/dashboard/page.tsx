import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Smartphone, ClipboardList, UserCheck, Clock, CalendarDays } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  // Get today's date range
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Fetch stats in parallel
  const [
    { count: totalEmployees },
    { count: activeEmployees },
    { count: totalDevices },
    { count: activeDevices },
    { count: todayCheckIns },
    { count: todayCheckOuts },
    { data: recentAttendance },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('devices').select('*', { count: 'exact', head: true }),
    supabase.from('devices').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'CHECK_IN')
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString()),
    supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'CHECK_OUT')
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString()),
    supabase
      .from('attendance_logs')
      .select(`
        id,
        type,
        timestamp,
        verification_status,
        employees (
          full_name,
          employee_id
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(5),
  ])

  const stats = [
    {
      title: 'Total Employees',
      value: totalEmployees || 0,
      subtitle: `${activeEmployees || 0} active`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Registered Devices',
      value: totalDevices || 0,
      subtitle: `${activeDevices || 0} active`,
      icon: Smartphone,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Today Check-ins',
      value: todayCheckIns || 0,
      subtitle: 'Today',
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Today Check-outs',
      value: todayCheckOuts || 0,
      subtitle: 'Today',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your attendance system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Recent Attendance
          </CardTitle>
          <CardDescription>Latest attendance records from employees</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttendance && recentAttendance.length > 0 ? (
            <div className="space-y-4">
              {recentAttendance.map((record) => {
                const employee = record.employees as unknown as {
                  full_name: string
                  employee_id: string
                }
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          record.type === 'CHECK_IN'
                            ? 'bg-green-100'
                            : 'bg-orange-100'
                        }`}
                      >
                        {record.type === 'CHECK_IN' ? (
                          <UserCheck
                            className={`h-4 w-4 ${
                              record.type === 'CHECK_IN'
                                ? 'text-green-600'
                                : 'text-orange-600'
                            }`}
                          />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{employee?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">
                          {employee?.employee_id || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          record.verification_status === 'VERIFIED'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {record.type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(record.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.timestamp).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No attendance records yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
