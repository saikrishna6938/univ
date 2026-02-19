import PublicRounded from '@mui/icons-material/PublicRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import { Alert, Box, Chip, CircularProgress, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EmployeeTask, LeadUser, TodayReminder } from '../../lib/api';
import { fetchEmployeeTasks, fetchLeadsSummary, fetchTaskAnalytics } from '../../lib/api';
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import './admin.css';

function getTaskAgingStatus(task: EmployeeTask): 'on_time' | 'aging' | 'critical' | null {
  if ((task.taskStatus || 'under_process') !== 'under_process') return null;
  if (task.taskAgingStatus) return task.taskAgingStatus;

  const lastUpdatedAt = task.taskUpdatedAt || task.createdAt;
  const updatedTime = new Date(lastUpdatedAt).getTime();
  if (Number.isNaN(updatedTime)) return 'on_time';

  const diffHours = (Date.now() - updatedTime) / (1000 * 60 * 60);
  if (diffHours < 24) return 'on_time';
  if (diffHours >= 24 * 6) return 'critical';
  return 'aging';
}

export default function AdminDashboardPage() {
  const { adminUser } = useAdminAuth();
  const [totalLeads, setTotalLeads] = useState(0);
  const [recentLoginCount, setRecentLoginCount] = useState(0);
  const [dailyRegistrations, setDailyRegistrations] = useState<Array<{ day: string; count: number }>>([]);
  const [recentUsers, setRecentUsers] = useState<LeadUser[]>([]);
  const [todaysRemindersCount, setTodaysRemindersCount] = useState(0);
  const [todaysReminders, setTodaysReminders] = useState<TodayReminder[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([]);
  const [usersByLocation, setUsersByLocation] = useState<Array<{ location: string; count: number }>>([]);
  const [employeeTaskCounts, setEmployeeTaskCounts] = useState<
    Array<{
      employeeUserId: number;
      employeeName: string;
      taskCount: number;
      onTimeCount: number;
      agingCount: number;
      criticalCount: number;
    }>
  >([]);
  const [countryTaskCounts, setCountryTaskCounts] = useState<Array<{ countryName: string; taskCount: number }>>([]);
  const [globalTaskAging, setGlobalTaskAging] = useState({ onTime: 0, aging: 0, critical: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refreshDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const isEmployee = adminUser?.role === 'employee';
      const [summary, tasks, analytics] = await Promise.all([
        fetchLeadsSummary(),
        isEmployee && adminUser?.id ? fetchEmployeeTasks(adminUser.id) : Promise.resolve([]),
        isEmployee ? Promise.resolve(null) : fetchTaskAnalytics()
      ]);
      if (!mountedRef.current) return;
      setTotalLeads(summary.totalLeads);
      setRecentLoginCount(summary.recentLoginCount);
      setDailyRegistrations(summary.dailyRegistrations);
      setRecentUsers(summary.recentUsers);
      setTodaysRemindersCount(summary.todaysRemindersCount);
      setTodaysReminders(summary.todaysReminders);
      setUsersByLocation(summary.usersByLocation);
      setEmployeeTasks(tasks);
      setEmployeeTaskCounts(analytics?.employeeTasks || []);
      setCountryTaskCounts(analytics?.countryTasks || []);
      setGlobalTaskAging(analytics?.taskAging || { onTime: 0, aging: 0, critical: 0, total: 0 });
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminUser?.id, adminUser?.role]);

  useEffect(() => {
    mountedRef.current = true;
    refreshDashboard(true);
    const intervalId = window.setInterval(() => {
      refreshDashboard(false);
    }, 5 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [refreshDashboard]);

  const thisWeekRegistrations = useMemo(
    () => dailyRegistrations.slice(-7).reduce((sum, item) => sum + item.count, 0),
    [dailyRegistrations]
  );

  const todayRegistrations = useMemo(
    () => dailyRegistrations[dailyRegistrations.length - 1]?.count || 0,
    [dailyRegistrations]
  );

  const peakDay = useMemo(() => {
    if (!dailyRegistrations.length) return null;
    return dailyRegistrations.reduce((max, item) => (item.count > max.count ? item : max), dailyRegistrations[0]);
  }, [dailyRegistrations]);

  const dailyChartMax = useMemo(() => Math.max(1, ...dailyRegistrations.map((item) => item.count)), [dailyRegistrations]);
  const locationChartMax = useMemo(() => Math.max(1, ...usersByLocation.map((item) => item.count)), [usersByLocation]);
  const countryTaskMax = useMemo(() => Math.max(1, ...countryTaskCounts.map((item) => item.taskCount)), [countryTaskCounts]);

  const linePoints = useMemo(() => {
    if (!dailyRegistrations.length) return '';
    const w = 100;
    const h = 100;
    return dailyRegistrations
      .map((item, index) => {
        const x = dailyRegistrations.length === 1 ? 0 : (index / (dailyRegistrations.length - 1)) * w;
        const y = h - (item.count / dailyChartMax) * h;
        return `${x},${Math.max(0, Math.min(h, y))}`;
      })
      .join(' ');
  }, [dailyRegistrations, dailyChartMax]);

  const underProcessTasks = useMemo(
    () => employeeTasks.filter((task) => (task.taskStatus || 'under_process') === 'under_process'),
    [employeeTasks]
  );
  const recentStudentUsers = useMemo(
    () =>
      recentUsers.filter((user) => {
        const role = String(user.role || '').toLowerCase();
        return role === 'student' || role === 'uploaded';
      }),
    [recentUsers]
  );

  const taskAgingBreakdown = useMemo(() => {
    const counts = adminUser?.role === 'employee'
      ? (() => {
          const localCounts = { onTime: 0, aging: 0, critical: 0 };
          for (const task of underProcessTasks) {
            const status = getTaskAgingStatus(task);
            if (status === 'critical') localCounts.critical += 1;
            else if (status === 'aging') localCounts.aging += 1;
            else if (status === 'on_time') localCounts.onTime += 1;
          }
          return localCounts;
        })()
      : {
          onTime: globalTaskAging.onTime || 0,
          aging: globalTaskAging.aging || 0,
          critical: globalTaskAging.critical || 0
        };

    const total = adminUser?.role === 'employee'
      ? counts.onTime + counts.aging + counts.critical
      : globalTaskAging.total || counts.onTime + counts.aging + counts.critical;
    const onTimePct = total ? (counts.onTime / total) * 100 : 0;
    const agingPct = total ? (counts.aging / total) * 100 : 0;
    const criticalPct = total ? (counts.critical / total) * 100 : 0;

    return {
      counts,
      total,
      pieBackground: `conic-gradient(
        #16a34a 0% ${onTimePct}%,
        #f59e0b ${onTimePct}% ${onTimePct + agingPct}%,
        #dc2626 ${onTimePct + agingPct}% 100%
      )`,
      percentages: {
        onTime: Math.round(onTimePct),
        aging: Math.round(agingPct),
        critical: Math.round(criticalPct)
      }
    };
  }, [adminUser?.role, underProcessTasks, globalTaskAging]);

  const kpis = useMemo(
    () => [
      {
        label: 'Total Leads',
        value: totalLeads,
        helper: 'All registered users',
        icon: <PublicRounded fontSize="small" sx={{ color: '#0284c7' }} />
      },
      {
        label: 'Today',
        value: todayRegistrations,
        helper: 'Registered today',
        icon: <TrendingUpRounded fontSize="small" sx={{ color: '#0369a1' }} />
      },
      {
        label: 'This Week',
        value: thisWeekRegistrations,
        helper: 'Registrations in last 7 days',
        icon: <TrendingUpRounded fontSize="small" sx={{ color: '#2563eb' }} />
      },
      ...(adminUser?.role === 'employee'
        ? [
            {
              label: 'My Tasks',
              value: underProcessTasks.length,
              helper: 'Under-process applications mapped to my countries',
              icon: <TrendingUpRounded fontSize="small" sx={{ color: '#0f766e' }} />
            }
          ]
        : [
            {
              label: 'Recent Logins',
              value: recentLoginCount,
              helper: 'Logged in during last 7 days',
              icon: <TrendingUpRounded fontSize="small" sx={{ color: '#0f766e' }} />
            }
          ]),
      {
        label: "Today's Reminders",
        value: todaysRemindersCount,
        helper: 'Pending follow-up reminders today',
        icon: <TrendingUpRounded fontSize="small" sx={{ color: '#b45309' }} />
      }
    ],
    [
      adminUser?.role,
      underProcessTasks.length,
      totalLeads,
      todayRegistrations,
      thisWeekRegistrations,
      recentLoginCount,
      todaysRemindersCount
    ]
  );

  return (
    <Box className="admin-dashboard">
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box className="admin-crm-hero">
        <Box>
          <Typography className="admin-crm-hero__title" variant="h4">
            CRM Dashboard
          </Typography>
          <Typography className="admin-crm-hero__subtitle">
            Monitor user leads, daily registrations, and recently registered users.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.2} className="admin-crm-hero__chips">
          <span className="admin-crm-pill">Daily Lead Trend</span>
          <span className="admin-crm-pill">Recent Registrations</span>
          <span className="admin-crm-pill">User Details</span>
        </Stack>
        <Box sx={{ position: 'absolute', top: 14, right: 14 }}>
          <Tooltip title="Refresh dashboard">
            <span>
              <IconButton color="primary" onClick={() => refreshDashboard(false)} disabled={loading || refreshing}>
                {refreshing ? <CircularProgress size={18} /> : <RefreshRounded />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Box className="admin-kpis">
        {loading
          ? Array.from({ length: 5 }).map((_, idx) => (
              <Box className="admin-kpi" key={`kpi-skeleton-${idx}`}>
                <Skeleton width="40%" />
                <Skeleton width="30%" height={46} />
                <Skeleton width="60%" />
              </Box>
            ))
          : kpis.map((kpi) => (
              <Box className="admin-kpi" key={kpi.label}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.8}>
                  <Typography variant="body2" color="text.secondary">
                    {kpi.label}
                  </Typography>
                  {kpi.icon}
                </Stack>
                <strong>{kpi.value}</strong>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                  <TrendingUpRounded sx={{ fontSize: 14 }} />
                  {kpi.helper}
                </Typography>
              </Box>
            ))}
      </Box>

      <Box className={`admin-grid ${adminUser?.role === 'employee' ? 'admin-grid--employee' : 'admin-grid--with-aging'}`}>
        <Box className="admin-panel">
          <Box className="admin-panel__head">
            <Typography variant="h6" fontWeight={800}>
              Daily Registered Users
            </Typography>
          </Box>
          <Box className="admin-panel__body">
            {loading ? (
              <Skeleton height={220} />
            ) : (
              <>
                <Box className="admin-line-chart">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="admin-line-chart__svg">
                    <polyline points={linePoints} fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
                    {dailyRegistrations.map((item, index) => {
                      const x = dailyRegistrations.length === 1 ? 0 : (index / (dailyRegistrations.length - 1)) * 100;
                      const y = 100 - (item.count / dailyChartMax) * 100;
                      const dayLabel = new Date(item.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      return (
                        <Tooltip key={item.day} title={`${dayLabel}: ${item.count} users`} arrow placement="top">
                          <circle cx={x} cy={Math.max(0, Math.min(100, y))} r="1.45" fill="#0284c7" />
                        </Tooltip>
                      );
                    })}
                  </svg>
                  <Box className="admin-line-chart__labels">
                    {dailyRegistrations.map((item) => (
                      <Typography key={`label-${item.day}`} variant="caption" className="admin-chart__label">
                        {new Date(item.day).toLocaleDateString(undefined, { day: '2-digit' })}
                      </Typography>
                    ))}
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Peak day: {peakDay ? `${new Date(peakDay.day).toLocaleDateString()} (${peakDay.count})` : 'N/A'}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Box className="admin-panel">
          <Box className="admin-panel__head">
            <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
              <PublicRounded sx={{ fontSize: 18, color: '#0369a1' }} />
              Users by Location
            </Typography>
          </Box>
          <Box className="admin-panel__body">
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => <Skeleton key={`location-skeleton-top-${idx}`} height={34} />)
            ) : (
              <Box className="admin-location-chart">
                {usersByLocation.map((item) => (
                  <Box className="admin-location-chart__item" key={`top-${item.location}`}>
                    <Tooltip title={`${item.location}: ${item.count} users`} arrow placement="top">
                      <Box className="admin-location-chart__track">
                        <Box className="admin-location-chart__bar" sx={{ height: `${Math.max(6, (item.count / locationChartMax) * 100)}%` }} />
                      </Box>
                    </Tooltip>
                    <Typography className="admin-location-chart__name" variant="caption">
                      {item.location}
                    </Typography>
                    <Typography className="admin-location-chart__count" variant="caption">
                      {item.count}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        <Box className="admin-panel">
          <Box className="admin-panel__head">
            <Typography variant="h6" fontWeight={800}>
              Task Aging Distribution
            </Typography>
          </Box>
          <Box className="admin-panel__body">
            {loading ? (
              <Skeleton height={220} />
            ) : taskAgingBreakdown.total === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No under-process tasks for aging breakdown.
              </Typography>
            ) : (
              <Box className="admin-task-aging">
                <Box className="admin-task-aging__pie-wrap">
                  <Box className="admin-task-aging__pie" sx={{ background: taskAgingBreakdown.pieBackground }} />
                  <Box className="admin-task-aging__center">
                    <Typography variant="h6" fontWeight={800}>
                      {taskAgingBreakdown.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tasks
                    </Typography>
                  </Box>
                </Box>
                <Stack spacing={1.2} sx={{ minWidth: 180 }}>
                  <Box className="admin-task-aging__legend-row">
                    <span className="admin-task-aging__dot admin-task-aging__dot--on-time" />
                    <Typography variant="body2" fontWeight={700}>On Time</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {taskAgingBreakdown.counts.onTime} ({taskAgingBreakdown.percentages.onTime}%)
                    </Typography>
                  </Box>
                  <Box className="admin-task-aging__legend-row">
                    <span className="admin-task-aging__dot admin-task-aging__dot--aging" />
                    <Typography variant="body2" fontWeight={700}>Aging</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {taskAgingBreakdown.counts.aging} ({taskAgingBreakdown.percentages.aging}%)
                    </Typography>
                  </Box>
                  <Box className="admin-task-aging__legend-row">
                    <span className="admin-task-aging__dot admin-task-aging__dot--critical" />
                    <Typography variant="body2" fontWeight={700}>Critical</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {taskAgingBreakdown.counts.critical} ({taskAgingBreakdown.percentages.critical}%)
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {adminUser?.role !== 'employee' ? (
        <Box className="admin-grid admin-grid--analytics">
          <Box className="admin-panel">
            <Box className="admin-panel__head">
              <Typography variant="h6" fontWeight={800}>
                Tasks by Employee
              </Typography>
            </Box>
            <Box className="admin-panel__body">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => <Skeleton key={`employee-task-skeleton-${idx}`} height={32} />)
              ) : employeeTaskCounts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No employee task mapping available.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {employeeTaskCounts.slice(0, 10).map((item) => (
                    <Box className="admin-employee-aging-card" key={`employee-task-${item.employeeUserId}`}>
                      <Box className="admin-employee-aging-card__head">
                        <Typography variant="body2" fontWeight={700}>
                          {item.employeeName}
                        </Typography>
                        <Chip size="small" label={`${item.taskCount} tasks`} color="info" variant="outlined" />
                      </Box>
                      <Box className="admin-employee-aging-card__metrics">
                        <Tooltip title="Updated within last 24 hours" arrow placement="top">
                          <Box className="admin-employee-aging-card__metric admin-employee-aging-card__metric--on-time">
                            <Typography variant="caption">OnTime</Typography>
                            <strong>{item.onTimeCount}</strong>
                          </Box>
                        </Tooltip>
                        <Tooltip title="Pending for 1 to 5 days" arrow placement="top">
                          <Box className="admin-employee-aging-card__metric admin-employee-aging-card__metric--aging">
                            <Typography variant="caption">Aging</Typography>
                            <strong>{item.agingCount}</strong>
                          </Box>
                        </Tooltip>
                        <Tooltip title="Pending for 6+ days" arrow placement="top">
                          <Box className="admin-employee-aging-card__metric admin-employee-aging-card__metric--critical">
                            <Typography variant="caption">Critical</Typography>
                            <strong>{item.criticalCount}</strong>
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          <Box className="admin-panel">
            <Box className="admin-panel__head">
              <Typography variant="h6" fontWeight={800}>
                Tasks by Country
              </Typography>
            </Box>
            <Box className="admin-panel__body">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => <Skeleton key={`country-task-skeleton-${idx}`} height={32} />)
              ) : countryTaskCounts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No country task data available.
                </Typography>
              ) : (
                <Box className="admin-insight-chart admin-insight-chart--country">
                  {countryTaskCounts.slice(0, 8).map((item) => (
                    <Box className="admin-insight-chart__item" key={`country-task-${item.countryName}`}>
                      <Typography className="admin-insight-chart__value" variant="caption">
                        {item.taskCount}
                      </Typography>
                      <Tooltip title={`${item.countryName}: ${item.taskCount} tasks`} arrow placement="top">
                        <Box className="admin-insight-chart__track">
                          <Box
                            className="admin-insight-chart__bar admin-insight-chart__bar--country"
                            sx={{ height: `${Math.max(8, (item.taskCount / countryTaskMax) * 100)}%` }}
                          />
                        </Box>
                      </Tooltip>
                      <Typography className="admin-insight-chart__label" variant="caption">
                        {item.countryName}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      ) : null}

      <Box className="admin-panel">
        <Box className="admin-panel__head">
          <Typography variant="h6" fontWeight={800}>
            Today's Reminders
          </Typography>
        </Box>
        <Box className="admin-panel__body">
          {loading ? (
            Array.from({ length: 5 }).map((_, idx) => <Skeleton key={`reminder-skeleton-${idx}`} height={36} />)
          ) : todaysReminders.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No reminders due today.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {todaysReminders.map((reminder) => (
                <Box className="admin-reminder-row" key={`reminder-${reminder.id}`}>
                  <Typography variant="body2" fontWeight={700}>
                    {reminder.userName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(reminder.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {reminder.conversationStatus}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {reminder.lookingFor || reminder.notes || '-'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>

      {adminUser?.role === 'employee' ? (
        <Box className="admin-panel">
          <Box className="admin-panel__head">
            <Typography variant="h6" fontWeight={800}>
              My Application Tasks (Country Access)
            </Typography>
          </Box>
          <Box className="admin-panel__body">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => <Skeleton key={`task-skeleton-${idx}`} height={36} />)
            ) : underProcessTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No under-process tasks mapped to your country access.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {underProcessTasks.slice(0, 30).map((task) => (
                  <Box className="admin-reminder-row" key={`task-${task.id}`}>
                    <Typography variant="body2" fontWeight={700}>
                      {task.applicantName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {task.countryName || 'Unknown country'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {task.status}
                    </Typography>
                    <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary">
                        {task.programName || '-'} {task.universityName ? `• ${task.universityName}` : ''}
                      </Typography>
                      {(() => {
                        const agingStatus = getTaskAgingStatus(task);
                        if (!agingStatus) return null;
                        if (agingStatus === 'on_time') return <Chip size="small" label="On Time" color="success" variant="outlined" />;
                        if (agingStatus === 'aging') return <Chip size="small" label="Aging" color="warning" variant="outlined" />;
                        return <Chip size="small" label="Critical" color="error" variant="outlined" />;
                      })()}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      ) : null}

      <Box className="admin-panel">
        <Box className="admin-panel__head">
          <Typography variant="h6" fontWeight={800}>
            Recent Leads Details
          </Typography>
        </Box>
        <Box className="admin-panel__body">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => <Skeleton key={`lead-row-skeleton-${idx}`} height={36} />)
          ) : (
            <Stack spacing={1}>
              {recentStudentUsers.slice(0, 12).map((user) => (
                <Box className="admin-lead-row" key={`lead-row-${user.id}`}>
                  <Typography variant="body2" fontWeight={700}>
                    {user.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.phone || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.city || '-'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(user.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              ))}
              {recentStudentUsers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No recent student/uploaded leads found.
                </Typography>
              ) : null}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}
