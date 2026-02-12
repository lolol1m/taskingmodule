import TaskingSummaryTab from '../tabs/TaskingSummaryTab.jsx'
import TaskingManagerTab from '../tabs/TaskingManagerTab.jsx'
import TabPlaceholder from '../tabs/TabPlaceholder.jsx'
import CompletedImagesTab from '../tabs/CompletedImagesTab.jsx'
import CreateUserTab from '../tabs/CreateUserTab.jsx'
import UserPresenceTab from '../tabs/UserPresenceTab.jsx'
import SetOpsVTab from '../tabs/SetOpsVTab.jsx'
import UploadsTab from '../tabs/UploadsTab.jsx'
import GenerateBinCountTab from '../tabs/GenerateBinCountTab.jsx'
import UpdateSensorCategoryTab from '../tabs/UpdateSensorCategoryTab.jsx'
import ChangePasswordTab from '../tabs/ChangePasswordTab.jsx'
import NotificationsPanel from '../../../components/notifications/NotificationsPanel.jsx'

const tabMap = {
  summary: TaskingSummaryTab,
  manager: TaskingManagerTab,
  completed: CompletedImagesTab,
  "admin-create-user": CreateUserTab,
  "admin-presence": UserPresenceTab,
  "admin-opsv": SetOpsVTab,
  "admin-uploads": UploadsTab,
  "admin-bin": GenerateBinCountTab,
  "admin-sensor": UpdateSensorCategoryTab,
  "settings-password": ChangePasswordTab
}

const tabLabelMap = {
  summary: 'Tasking Summary',
  manager: 'Tasking Manager',
  completed: 'Completed Images',
  'admin-create-user': 'Create User',
  'admin-presence': 'User Presence',
  'admin-opsv': 'Set OPS V',
  'admin-uploads': 'Uploads',
  'admin-bin': 'Generate Bin Count',
  'admin-sensor': 'Update Sensor Category',
  'settings-password': 'Change Password',
}

function ContentSection({ activeTab, dateRange, onOpenDatePicker, isCollapsed, userRole }) {
  const ActiveTab = tabMap[activeTab]
  const activeTabLabel = tabLabelMap[activeTab] || 'Overview'
  const sectionLabel = activeTab?.startsWith('admin-') ? 'ADMIN' : 'HOME'

  return (
    <section className="content">
      <div className="content__page-header">
        <div className="content__breadcrumb" aria-label="Current page">
          <span className="content__breadcrumb-home">{sectionLabel}</span>
          <span className="content__breadcrumb-separator">/</span>
          <span className="content__breadcrumb-current">{activeTabLabel}</span>
        </div>
        <NotificationsPanel />
      </div>
      <div className="content__body">
        <div className="content__tab-shell">
          {ActiveTab ? (
            <ActiveTab dateRange={dateRange} onOpenDatePicker={onOpenDatePicker} isCollapsed={isCollapsed} userRole={userRole} />
          ) : (
            <TabPlaceholder title="Not found" description="No view is mapped for this selection." />
          )}
        </div>
      </div>
    </section>
  )
}

export default ContentSection
