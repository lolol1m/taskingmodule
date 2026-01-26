import TaskingSummaryTab from '../tabs/TaskingSummaryTab.jsx'
import TaskingManagerTab from '../tabs/TaskingManagerTab.jsx'
import TabPlaceholder from '../tabs/TabPlaceholder.jsx'

const tabMap = {
  summary: TaskingSummaryTab,
  manager: TaskingManagerTab,
}

function ContentSection({ activeTab, dateRange, onOpenDatePicker, isCollapsed }) {
  const ActiveTab = tabMap[activeTab]

  return (
    <section className="content">
      {ActiveTab ? (
        <ActiveTab dateRange={dateRange} onOpenDatePicker={onOpenDatePicker} isCollapsed={isCollapsed} />
      ) : (
        <TabPlaceholder title="Not found" description="No view is mapped for this selection." />
      )}
    </section>
  )
}

export default ContentSection
