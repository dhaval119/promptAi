import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Main() {
  const router = useRouter();

  useEffect(() => {
      const row1 = document.getElementById("row1");
      const row2 = document.getElementById("row2");
      const featuresTop = 930;
      const featuresBottom = featuresTop + 900;
      let lastScrollY = 0;
      
      const handleScroll = () => {
          const scrollY = window.scrollY;
          const progress = Math.max(0, Math.min(1, (scrollY - featuresTop + 300) / (featuresBottom - featuresTop)));
          if (progress < 1) {
              const moveAmount = progress * 400;
              if(row1) row1.style.transform = `translateX(${moveAmount}px)`;
              if(row2) row2.style.transform = `translateX(-${moveAmount}px)`;
          } else {
              if(row1) row1.style.transform = "translateX(400px)";
              if(row2) row2.style.transform = "translateX(-400px)";
          }
          lastScrollY = scrollY;
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleFaq = (e) => {
      e.currentTarget.parentElement.classList.toggle('active');
  };

  return (
    <>
      <Head>
        <title>PromptMagic - AI Prompt Generator</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>
      
      <div className="container">
          <div className="hero-bg"></div>
          <h1 className="main-heading">Get AI-generated</h1>
          <p className="sub-heading">production-ready prompts in seconds</p>
          
          <div className="btn-big" onClick={() => router.push('/chat')}>
              <span>GET STARTED</span>
              <img src="/assets/arrow.png" alt="Arrow" className="arrow-img" />
          </div>
          <h2 className="section-title title1">A Seamless User Experience</h2>
          <h2 className="section-title title2">Built by Professionals, for Professionals</h2>
          <p className="description">
              This is the place where you simply write your imagination, and AI transforms it into a fully AI-ready prompt.<br/><br/>
              Whether you’re writing blogs, creating social media posts, or working on any creative project — AI helps you express your thoughts clearly and professionally.<br/><br/>
              See how your simple ideas become “AI-ready prompts” — ready to use instantly with Gemini or any other model. Your words, our intelligence — together, we craft the perfect prompt.
          </p>
          
          <div className="features-container">
              <div id="row1" className="feature-row">
                  <div className="feature-card"><div className="card-header">FEATURE 1</div><div className="card-body white">Ready-to-use prompts.</div></div>
                  <div className="feature-card"><div className="card-header">FEATURE 2</div><div className="card-body dark">Your ideas stay private.</div></div>
                  <div className="feature-card"><div className="card-header">FEATURE 3</div><div className="card-body white">Instant, quality results.</div></div>
              </div>
              <div id="row2" className="feature-row" style={{ marginTop: '52px' }}>
                  <div className="feature-card"><div className="card-header">FEATURE 4</div><div className="card-body dark">Keep and reuse your best ones.</div></div>
                  <div className="feature-card"><div className="card-header">FEATURE 5</div><div className="card-body white">Think ideas, not words.</div></div>
                  <div className="feature-card"><div className="card-header">FEATURE 6</div><div className="card-body dark">Copy & use anywhere fast.</div></div>
              </div>
          </div>
          <div className="main-img"></div>
          
          <div className="second-hero" id="about-section"></div>
          
          <h1 className="second-heading">
              Get All the Type of prompt You Need <br /> In a Single Platform
          </h1>
          <div className="second-btn" onClick={() => router.push('/chat')}>
              GET STARTED
              <img src="/assets/arrow.png" alt="Arrow" className="arrow-img" style={{ width: '18px', height: '18px' }} />
          </div>
          
          <div className="faq-wrapper" id="faq-section">
              <h2 className="faq-heading">Frequently asked<br/>questions</h2>
              <div className="faq-item active">
                  <div className="faq-question" onClick={toggleFaq}>
                      How does Prompt AI work?
                      <svg className="faq-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                  <div className="faq-answer">
                      Simply type your situation or requirement in any language. Our system sends it to the Gemini API, processes it, and returns a refined, structured, and high-quality prompt that you can directly copy and use with any AI.
                  </div>
              </div>
          </div>
      </div>

      <div className="nav">
          <a href="#">Home</a> 
          <a href="/features">Features</a> 
          <a href="#about-section">About Us</a> 
          <a href="#faq-section">FAQ</a> 
          <div className="user-icon" onClick={() => router.push('/details')}>
              <svg viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
          </div>
      </div>
          
      <div className="btn-top" onClick={() => router.push('/chat')}>GET STARTED</div>
      <div className="logo"></div>

      <style jsx>{`
        /* EXACT CSS FROM TUMHARI FILE */
        html { scroll-behavior: smooth; }
        :root { --color-white: #ffffff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #020202; color: white; overflow-x: hidden; display: flex; justify-content: center; }
        .container { width: 1920px; min-height: 3500px; position: relative; transform: scale(0.8); transform-origin: top center; flex-shrink: 0; }
        .hero-bg { position: absolute; top: 0; left: 0; width: 100%; height: 906px; background: url("/assets/video.gif") center/cover no-repeat; filter: blur(35px); }
        .logo { height: 50px; width: 50px; display: block; position: fixed; left: 26px; top: 23px; z-index: 999; background: url("/assets/ailogo.png") center/contain no-repeat; }
        .main-heading { position: absolute; top: 328px; left: 369px; font-size: 130px; font-weight: 900; }
        .sub-heading { position: absolute; top: 827px; left: 1184px; font-size: 22px; font-weight: bold; }
        .nav { position: fixed; top: 31px; right: 240px; display: flex; align-items: center; gap: 24px; border: 1px solid var(--color-white); border-radius: 50px; padding: 6px 24px; background: #020202; z-index: 999; }
        .nav a { color: var(--color-white); text-decoration: none; font-weight: 500; font-size: 16px; transition: color 0.3s, text-shadow 0.3s; }
        .nav a:hover { color: #f0f0f0; text-shadow: 0 0 8px rgba(255, 255, 255, 0.6); }
        .user-icon { display: flex; align-items: center; justify-content: center; margin-left: 5px; cursor: pointer; }
        .user-icon svg { width: 24px; height: 24px; fill: var(--color-white); stroke: none; }
        .btn-top { position: fixed; top: 31px; right: 55px; width: 144px; height: 37px; background: black; border: 1px solid white; border-radius: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.3s; z-index: 999; }
        .btn-top:hover { background: white; color: black; }
        .btn-big { position: absolute; top: 814px; left: 1630px; width: 204px; height: 53px; background: white; border-radius: 50px; display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: bold; font-size: 18px; color: black; cursor: pointer; transition: 0.4s; }
        .btn-big:hover { background: #e0e0e0; }
        .btn-big:hover .arrow-img { transform: translateX(10px) rotate(20deg); }
        .arrow-img { width: 24px; height: 24px; transition: 0.4s; }
        .section-title { position: absolute; font-weight: 900; font-size: 50px; }
        .title1 { top: 1049px; left: 107px; }
        .title2 { top: 1943px; left: 107px; }
        .description { position: absolute; top: 2083px; left: 107px; width: 755px; font-size: 25px; font-weight: bold; line-height: 1.8; }
        .features-container { position: absolute; top: 1229px; left: 107px; width: 1650px; }
        .feature-row { display: flex; gap: 35px; transition: transform 0.1s ease-out; }
        .feature-card { width: 502px; height: 176px; border-radius: 25px; overflow: hidden; flex-shrink: 0; }
        .card-header { height: 66px; background: #1e1e1e; padding: 21px 32px; font-size: 20px; font-weight: bold; color: white; }
        .card-body { height: 110px; padding: 32px; font-size: 25px; font-weight: bold; }
        .white { background: white; color: black; }
        .dark { background: #0e0e0e; color: white; }
        .main-img { position: absolute; top: 1700px; left: 750px; width: 1300px; height: 1300px; background: url("/assets/main12.gif") center/cover no-repeat; border-radius: 20px; z-index: -1; filter: blur(25px); }
        .second-hero { position: absolute; top: 2680px; left: 0; width: 100%; height: 906px; background: url("/assets/video.gif") center/cover no-repeat; filter: blur(35px); }
        .second-heading { position: absolute; top: 3200px; left: 130px; font-size: 60px; font-weight: 900; width: 3000px; line-height: 1.4; }
        .second-btn { position: absolute; top: 3400px; left: 130px; width: 170px; height: 50px; background: white; border-radius: 50px; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: bold; color: black; cursor: pointer; }
        .second-btn:hover { background: #e0e0e0; color: black; }
        .second-btn:hover .arrow-img { transform: translateX(5px); }
        .faq-wrapper { position: absolute; top: 3700px; left: 130px; width: 1650px; color: white; }
        .faq-heading { font-size: 70px; font-weight: 900; line-height: 1.1; margin-bottom: 80px; letter-spacing: -1px; }
        .faq-item { border-bottom: 1px solid #333; padding: 30px 0; }
        .faq-question { font-size: 24px; font-weight: 700; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; }
        .faq-question:hover { opacity: 0.9; }
        .faq-icon { width: 24px; height: 24px; fill: none; stroke: white; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.3s ease; }
        .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.4s ease, padding 0.4s ease; font-size: 18px; line-height: 1.6; color: #e0e0e0; padding-right: 50px; }
        .faq-item.active .faq-answer { max-height: 200px; padding-top: 20px; }
        .faq-item.active .faq-icon { transform: rotate(180deg); }
      `}</style>
    </>
  );
}