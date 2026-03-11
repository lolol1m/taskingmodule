function SubmissionTab({
  title = 'Submission',
  subtitle = 'Submission review is temporarily disabled.',
}) {
  return (
    <div className="completed-images">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">{title}</div>
          <div className="content__subtitle">{subtitle}</div>
        </div>
        <div className="content__controls" />
      </div>

      <div className="completed-images__grid" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="completed-images__error">IR/SF submission flow is temporarily disabled.</div>
      </div>
    </div>
  )
}

export default SubmissionTab
