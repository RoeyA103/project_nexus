function EventRow({ event }) {
  const isAttack = /union|select|drop|1=1|admin|'--|\.\.\/|%2e%2e|\.git|\.env/i.test(event.path);
  const statusNum = Number(event.status);
  return (
    <div className={`event-row ${isAttack ? "event-row-attack" : ""}`}>
      <span className="event-row-time">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "—"}</span>
      <span className={`event-row-method-${event.method === "POST" ? "post" : event.method === "DELETE" ? "delete" : "other"}`}>{event.method}</span>
      <span className="event-row-ip">{event.ip}</span>
      <span className={`event-row-path ${isAttack ? "event-row-path-attack" : ""}`} title={event.path}>{event.path}</span>
      <span className={`event-row-status-${statusNum >= 400 ? "error" : statusNum >= 300 ? "redirect" : "success"}`}>{event.status}</span>
    </div>
  );
}

export default EventRow;