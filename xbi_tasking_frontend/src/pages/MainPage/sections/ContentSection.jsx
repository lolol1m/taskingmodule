import TaskingSummaryTab from '../tabs/TaskingSummaryTab.jsx'
import TaskingManagerTab from '../tabs/TaskingManagerTab.jsx'
import TabPlaceholder from '../tabs/TabPlaceholder.jsx'
import CompletedImagesTab from '../tabs/CompletedImagesTab.jsx'
import UserPresenceTab from '../tabs/UserPresenceTab.jsx'
import UploadsTab from '../tabs/UploadsTab.jsx'
import GenerateBinCountTab from '../tabs/GenerateBinCountTab.jsx'
import UpdateSensorCategoryTab from '../tabs/UpdateSensorCategoryTab.jsx'
import ChangePasswordTab from '../tabs/ChangePasswordTab.jsx'
import SubmissionTab from '../tabs/SubmissionTab.jsx'
import NotificationsPanel from '../../../components/notifications/NotificationsPanel.jsx'

const tabMap = {
  summary: TaskingSummaryTab,
  manager: TaskingManagerTab,
  'completed-unverified': TaskingSummaryTab,
  'completed-verified': CompletedImagesTab,
  submission: SubmissionTab,
  "admin-presence": UserPresenceTab,
  "admin-uploads": UploadsTab,
  "admin-bin": GenerateBinCountTab,
  "admin-sensor": UpdateSensorCategoryTab,
  "settings-password": ChangePasswordTab
}

const tabLabelMap = {
  summary: 'Tasking Summary',
  manager: 'Tasking Assignments',
  'completed-unverified': 'Unverified Tasks',
  'completed-verified': 'Verified Tasks',
  submission: 'Submission',
  'admin-presence': 'Users',
  'admin-uploads': 'Uploads',
  'admin-bin': 'Generate Bin Count',
  'admin-sensor': 'Update Sensor Category',
  'settings-password': 'Change Password',
}

const formatDateRange = (range) => {
  if (!range) return 'Select display date'
  const start = range['Start Date']
  const end = range['End Date']
  if (!start || !end) return 'Select display date'
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Select display date'
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  })
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`
}

function ContentSection({ activeTab, dateRange, onOpenDatePicker, isCollapsed, userRole, isDevMode }) {
  const ActiveTab = tabMap[activeTab]
  const activeTabLabel = tabLabelMap[activeTab] || 'Overview'
  const sectionLabel = activeTab?.startsWith('admin-') ? 'ADMIN' : 'HOME'
  const tabProps =
    activeTab === 'completed-unverified'
      ? {
          title: 'Unverified Tasks',
          subtitle: 'Review and verify completed tasks for the selected date range.',
          taskStatusFilter: 'verifying',
          showVerificationActions: true,
          verificationOnlyActions: true,
          readOnlyInputs: true,
        }
      : activeTab === 'summary'
        ? {
            title: 'Tasking Summary',
            subtitle: 'Task status overview for the selected date range.',
            taskStatusFilter: ['incomplete', 'in progress', 'not started'],
            showVerificationActions: false,
          }
        : activeTab === 'manager'
          ? { title: 'Tasking Assignments', subtitle: 'Manage tasking priorities, assignees, and TTGs.' }
          : activeTab === 'completed-verified'
            ? { title: 'Verified Tasks', subtitle: 'Review verified completed imagery for the selected date range.' }
            : {}

  return (
    <section className="content">
      <div className="content__page-header">
        <div className="content__breadcrumb" aria-label="Current page">
          <span className="content__breadcrumb-home">{sectionLabel}</span>
          <span className="content__breadcrumb-separator">/</span>
          <span className="content__breadcrumb-current">{activeTabLabel}</span>
        </div>
        <div className="content__header-actions">
          <button type="button" className="content__date-button" onClick={onOpenDatePicker}>
            <img className="content__date-icon" src="/src/assets/calendar.png" alt="" />
            <span className="content__date-label">{formatDateRange(dateRange)}</span>
          </button>
          <NotificationsPanel />
        </div>
      </div>
      <div className="content__body">
        <div className="content__tab-shell">
          {ActiveTab ? (
            <ActiveTab
              dateRange={dateRange}
              onOpenDatePicker={onOpenDatePicker}
              isCollapsed={isCollapsed}
              userRole={userRole}
              isDevMode={isDevMode}
              {...tabProps}
            />
          ) : (
            <TabPlaceholder title="Not found" description="No view is mapped for this selection." />
          )}
        </div>
      </div>
    </section>
  )
}

export default ContentSection
