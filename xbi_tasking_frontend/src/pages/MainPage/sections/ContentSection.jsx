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

function ContentSection({ activeTab, dateRange, onOpenDatePicker, isCollapsed, userRole }) {
  const ActiveTab = tabMap[activeTab]

  return (
    <section className="content">
      {ActiveTab ? (
        <ActiveTab dateRange={dateRange} onOpenDatePicker={onOpenDatePicker} isCollapsed={isCollapsed} userRole={userRole} />
      ) : (
        <TabPlaceholder title="Not found" description="No view is mapped for this selection." />
      )}
    </section>
  )
}

export default ContentSection
