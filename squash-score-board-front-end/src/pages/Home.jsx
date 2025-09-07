import heroImg from "../../squashworks.jpg";

export default function Home() {
  return (
    <>
      <section className="hero hero--split">
        <div className="hero-inner hero-content" style={{padding: 36}}>
          <div className="kicker">Welcome to Squashworks</div>
          <h1 className="hero-title gradient-text" style={{marginTop: 10}}>Play Squash. Feel Alive.</h1>
          <p className="hero-sub" style={{marginTop: 6}}>
            Life is simple, Eat, Sleep, <strong>Play Squash</strong>, Repeat.
          </p>
          <div className="hero-actions" style={{marginTop: 10}}>
            <a className="btn btn-primary" href="/teams">Explore Teams</a>
            <a className="btn btn-ghost" href="/matches">Start a Match</a>
          </div>
          <div className="muted" style={{marginTop: 10, fontSize: 14}}>
            225 S. 500 E., SLC UT 84102 • <a className="link" href="tel:801-355-5800">801-355-5800</a> • <a className="link" href="https://maps.app.goo.gl/v8DtkS5d5yggMdmG7" target="_blank" rel="noreferrer noopener">Open map</a>
          </div>
        </div>
        <div className="hero-side" style={{padding: 18, paddingLeft: 0}}>
          <div className="hero-media" aria-label="Squashworks club court photo">
            <div className="hero-media-img" style={{backgroundImage: `url(${heroImg})`}} />
          </div>
        </div>
        <div className="hero-gradient" />
      </section>

  
    </>
  );
}
