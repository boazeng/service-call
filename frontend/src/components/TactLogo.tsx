import '../styles/TactLogo.css'

/* The TACT brand mark: spaced T·A·C·T letters with rust dots between, plus a
   word ("accounting" by default) on the other side of the mark. Ported verbatim
   from the tact-design-account-web skill asset. */
type Props = {
  tone?: 'light' | 'dark'
  size?: number
  word?: string | false
  tagline?: boolean
  taglineText?: string
}

export default function TactLogo({
  tone = 'light',
  size = 1,
  word = 'accounting',
  tagline = false,
  taglineText = '',
}: Props) {
  const letters = ['T', 'A', 'C', 'T']
  return (
    <span
      className={`tact-logo tact-logo-${tone}`}
      style={{ ['--tact-scale' as string]: size }}
    >
      <span className="tact-logo-lockup">
        <span className="tact-logo-row">
          <span className="tact-logo-mark">
            {letters.map((l, i) => (
              <span key={i} className="tact-logo-seg">
                <span className="tact-logo-letter">{l}</span>
                {i < letters.length - 1 && <span className="tact-logo-dot" />}
              </span>
            ))}
          </span>
          {word && <span className="tact-logo-word">{word}</span>}
        </span>
        {tagline && <span className="tact-logo-tagline">{taglineText}</span>}
      </span>
    </span>
  )
}
