import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

// A marked row also says why in text, so the mark survives without colour. A `fail` status
// is already text in the status cell; only the retries need a note.
const isWarn = (row: DigestRow) => row.lastStatus === 'fail' || row.retries >= 3;

function Row({ row }: { row: DigestRow }) {
  return (
    <tr class={isWarn(row) ? 'warn' : undefined}>
      <td>{row.job}</td>
      <td>{row.owner ?? dash}</td>
      <td>{row.runs}</td>
      <td>{row.retries}</td>
      <td>
        {row.lastStatus}
        {row.retries >= 3 ? ' · 3+ retries' : ''}
      </td>
      <td>{row.lastError ?? dash}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}

export function Digest({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <Row row={row} />
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 ? (
        <p class="mute">
          {night.badLines} {night.badLines === 1 ? 'line' : 'lines'} didn't parse
        </p>
      ) : null}
    </>
  );
}
