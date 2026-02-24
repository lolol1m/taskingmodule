function TabPlaceholder({ title, description }) {
  return (
    <div className="content__panel">
      <div className="content__heading">
        <div className="content__title">{title}</div>
        {description && <div className="content__subtitle">{description}</div>}
      </div>
    </div>
  )
}

export default TabPlaceholder
