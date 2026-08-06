import { useState, useRef, useEffect } from "react";

const C = {
  bg: "#f5f5f0", panel: "#ffffff",
  border: "#e0e0d8", borderHi: "#c0c0b8",
  green: "#16a34a", greenDim: "#bbf7d0", greenBg: "#f0fdf4",
  amber: "#d97706", amberDim: "#fef3c7", amberBg: "#fffbeb",
  blue: "#2563eb", blueDim: "#dbeafe",
  red: "#dc2626", redBg: "#fef2f2",
  purple: "#7c3aed", purpleBg: "#f5f3ff", purpleDim: "#ede9fe",
  text: "#1a1a18", dim: "#707068", heading: "#0a0a08",
};

const MODELS = {
  doc:       "llama-3.3-70b-versatile",
  interview: "meta-llama/llama-4-scout-17b-16e-instruct",
};

const PROXY = "https://respectful-luck-production-8277.up.railway.app";

const SARVAM_LANGUAGES = [
  { code: "hi-IN", label: "Hindi" },
  { code: "en-IN", label: "English (IN)" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "bn-IN", label: "Bengali" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "mr-IN", label: "Marathi" },
];

const SARVAM_SPEAKERS = ["anushka","manisha","vidya","arya","abhilash","karun","hitesh"];

const EMAIL_STYLES = [
  {
    id: "none", label: "No style guide",
    hint: "LLM decides tone",
    sample: "",
  },
  {
    id: "fresher",
    label: "Fresher (first application)",
    hint: "Student with projects, no work exp",
    sample: `Dear [Name],\n\nI came across the listing on LinkedIn and wanted to apply. I am a final-year CS student graduating in May 2025.\n\nMost of what I know comes from building things outside class. My most complete project is a traffic signal controller using reinforcement learning — the agent runs in CityFlow simulator and outperforms fixed-timing baselines on standard flow files. The reward function took several iterations; penalising queue length alone caused oscillation, so I added a delay-delta term to stabilise it.\n\nI would be glad to discuss this in more detail. A brief call at your convenience would be welcome.\n\nRegards,\n[Name]`,
  },
  {
    id: "career_change",
    label: "Career transition",
    hint: "Non-CS background moving into tech",
    sample: `Dear Hiring Team,\n\nI am applying for the ML Engineer position. My background is in Electronics Engineering, but the last two years have been focused entirely on machine learning systems.\n\nThe work I am most confident about is an image super-resolution pipeline I built for satellite imagery. The main challenge was data quality — over half the image pairs had alignment errors. I pivoted to a synthetic degradation approach, generating low-resolution inputs from clean sources, which gave stable training and measurable PSNR improvement.\n\nI would appreciate the opportunity to discuss the role.\n\nSincerely,\n[Name]`,
  },
  {
    id: "experienced",
    label: "Experienced (2+ years)",
    hint: "Working professional with proven track record",
    sample: `[Name],\n\nApplying for the Senior ML Engineer role. I currently work on production recommendation systems; before that I spent two years on NLP pipelines.\n\nThe work most relevant to your JD is a real-time feature store I built on top of Redis and Kafka. The original system had 200ms P99 latency making online inference unusable. Moving feature pre-computation offline cut P99 to 18ms. The harder part was keeping offline and online feature definitions in sync — we generated both from a single YAML schema, eliminating an entire class of training-serving skew bugs.\n\nHappy to do a technical screen at whatever depth is useful.\n\n[Name]`,
  },
  {
    id: "startup",
    label: "Startup / direct",
    hint: "Small team, informal culture, founder-led",
    sample: `Hi [Name],\n\nSaw the posting for a fullstack ML engineer. Here is the relevant bit: I built and shipped an offline-first Flutter app that runs a 4-bit quantised Llama model on-device — no cloud, no API calls, works on mid-range Android. The main constraint was RAM: getting 2.1GB headroom required careful memory mapping and lazy model loading.\n\nOn the backend side I have done Lambda + Terraform stacks and FastAPI work.\n\nWould a 20-minute call work this week?\n\n[Name]`,
  },
];

const DEMO_PROFILE = {
  name:"Alex Demo", email:"demo@example.com",
  linkedin:"alexdemo",   // ← just the handle after linkedin.com/in/
  github:"karpathy",     // real public GitHub with actual ML repos
  college:"Demo University", degree:"B.Tech Computer Science",
  gradYear:"2025", location:"Delhi, India",
  countryCode:"+91", phoneNumber:"9999999999",
  manualKB:"",
};

const DEMO_JD = `Machine Learning Engineer — AI Infrastructure

We are looking for an ML Engineer to build production AI systems.

Responsibilities:
- Design reinforcement learning pipelines for real-time decision systems
- Build serverless cloud infrastructure on AWS using Terraform
- Develop on-device inference pipelines for edge AI applications
- Implement NLP modules and language model fine-tuning
- Write clean Python services with FastAPI

Requirements:
- Strong Python and deep learning background (PyTorch or TensorFlow)
- Experience with RL frameworks and multi-agent simulation
- Hands-on with cloud infrastructure and IaC (Terraform preferred)
- LLMOps and quantization for edge deployment
- Data science workflows: feature engineering, ensemble methods
- Bonus: mobile ML, computer vision, React`;

const SKILL_SYNONYMS = {
  " ml ":"machine learning","llm":"llm","gpt":"llm","bert":"nlp",
  "large language model":"llm","generative ai":"llm","fine-tun":"llm",
  "computer vision":"cv","object detection":"cv","yolo":"cv",
  "pytorch":"pytorch","tensorflow":"tensorflow","keras":"keras",
  "scikit":"machine learning","numpy":"data science","pandas":"data science",
  "huggingface":"llm","transformers":"llm","diffusion":"generative ai",
  "rag":"rag","vector database":"rag","embedding":"machine learning",
  "reinforcement learning":"reinforcement learning","rl agent":"reinforcement learning",
  "rl framework":"reinforcement learning","multi-agent":"reinforcement learning",
  "edge ai":"edge ai","on-device":"edge ai","quantiz":"edge ai","onnx":"edge ai",
  "llmops":"llmops","llm ops":"llmops","model serving":"llmops",
  "inference pipeline":"edge ai","on-device inference":"edge ai",

  "aws":"aws","amazon web services":"aws","lambda":"aws","ec2":"aws","s3":"aws",
  "gcp":"gcp","google cloud":"gcp","azure":"azure",
  "kubernetes":"devops","docker":"devops","k8s":"devops","helm":"devops",
  "terraform":"terraform","pulumi":"infrastructure","iac":"terraform",
  "infrastructure as code":"terraform","serverless":"aws",
  "ci/cd":"devops","github actions":"devops","jenkins":"devops","gitlab":"devops",
  "microservice":"backend","api gateway":"backend","rest api":"backend",
  "graphql":"backend","grpc":"backend","kafka":"messaging","rabbitmq":"messaging",

  "fastapi":"fastapi","flask":"python","django":"python",
  "react.js":"react","vue.js":"react","angular":"react","next.js":"react",
  "typescript":"javascript","node.js":"javascript","express":"javascript",
  "flutter":"flutter","dart":"flutter","react native":"mobile","swift":"ios",
  "kotlin":"android","android":"android","ios":"ios",

  "sql":"databases","postgres":"databases","mysql":"databases",
  "mongodb":"databases","redis":"databases","elasticsearch":"databases",
  "snowflake":"data warehouse","bigquery":"data warehouse","redshift":"data warehouse",
  "dbt":"data engineering","airflow":"data engineering","spark":"data engineering",
  "etl":"data engineering","tableau":"bi","power bi":"bi","looker":"bi",
  "feature engineering":"data science","ensemble":"data science",

  "seo":"seo","search engine optim":"seo","sem":"sem","ppc":"paid ads",
  "google ads":"google ads","meta ads":"paid ads","facebook ads":"paid ads",
  "google analytics":"analytics","ga4":"analytics","mixpanel":"analytics",
  "a/b test":"a/b testing","conversion rate":"cro","ctr":"digital marketing",
  "email marketing":"email marketing","mailchimp":"email marketing","klaviyo":"email marketing",
  "content market":"content marketing","copywriting":"copywriting","seo copywriting":"seo",
  "social media":"social media management","instagram":"social media management",
  "hubspot":"crm","salesforce":"crm","zoho":"crm","pipedrive":"crm",
  "brand strateg":"branding","campaign manag":"campaign management",
  "influencer":"influencer marketing","affiliate":"affiliate marketing",
  "keyword research":"seo","backlink":"seo","domain authority":"seo",
  "growth hacking":"growth marketing","performance marketing":"paid ads",

  "financial model":"financial modelling","dcf":"valuation","lbo":"valuation",
  "excel":"excel","vba":"excel","pivot table":"excel","financial analysis":"excel",
  "accounting":"accounting","p&l":"financial reporting","income statement":"financial reporting",
  "balance sheet":"financial reporting","cash flow":"financial reporting",
  "equity research":"equity research","investment banking":"investment banking",
  "private equity":"private equity","venture capital":"venture capital",
  "bloomberg":"bloomberg","risk management":"risk management","compliance":"compliance",
  "financial planning":"fp&a","budgeting":"fp&a","forecasting":"fp&a",
  "audit":"auditing","tax":"taxation","ifrs":"accounting","gaap":"accounting",

  "product roadmap":"product management","user story":"agile","sprint":"agile",
  "scrum":"agile","kanban":"agile","jira":"project management",
  "confluence":"documentation","notion":"documentation",
  "go-to-market":"gtm strategy","gtm":"gtm strategy",
  "stakeholder":"stakeholder management","okr":"okrs","kpi":"kpis",
  "user research":"user research","usability test":"ux research",
  "product requirement":"product management","prd":"product management",
  "product strategy":"product management","market research":"market research",
  "competitive analysis":"market research","voice of customer":"user research",

  "figma":"figma","sketch":"design","adobe xd":"design","invision":"design",
  "photoshop":"adobe creative suite","illustrator":"adobe creative suite",
  "after effects":"motion design","premiere pro":"video editing","final cut":"video editing",
  "ux design":"ux design","ui design":"ui design","wireframe":"wireframing",
  "prototyping":"prototyping","design system":"design systems","accessibility":"accessibility",
  "motion graphic":"motion design","3d model":"3d design","blender":"3d design",
  "brand design":"branding","typography":"design","color theory":"design",

  "recruitment":"recruitment","talent acquisition":"recruitment","sourcing":"recruitment",
  "onboarding":"hr operations","payroll":"payroll","hris":"hris","workday":"hris",
  "performance review":"performance management","learning and development":"l&d",
  "employee engagement":"hr operations","culture":"hr operations",

  "supply chain":"supply chain","logistics":"logistics","warehouse":"warehousing",
  "procurement":"procurement","vendor management":"vendor management",
  "inventory":"inventory management","erp":"erp","sap":"sap","oracle":"erp",
  "six sigma":"operations","lean":"operations","process improvement":"operations",
};

const SYNONYM_REVERSE = {};
Object.entries(SKILL_SYNONYMS).forEach(([k, v]) => {
  if (!SYNONYM_REVERSE[v]) SYNONYM_REVERSE[v] = [];
  SYNONYM_REVERSE[v].push(k.trim());
});

function canonicalize(raw) {
  const r = raw.toLowerCase().trim();
  for (const [k, v] of Object.entries(SKILL_SYNONYMS)) {
    if (r.includes(k.trim()) || k.trim().includes(r)) return v;
  }
  return r;
}

function enrichKBSkills(kb) {
  return kb.map(e => ({
    ...e,
    skills: [...new Set([
      ...e.skills,
      ...e.skills.map(s => canonicalize(s)),
      ...Object.entries(SKILL_SYNONYMS)
        .filter(([k]) => e.facts.some(f => f.toLowerCase().includes(k.trim())))
        .map(([, v]) => v),
    ])],
  }));
}

function extractSkills(jd, ragKB) {
  const t = jd.toLowerCase();
  const found = new Set();
  ragKB.forEach(e => e.skills.forEach(s => {
    if (s.length > 2 && t.includes(s.toLowerCase())) found.add(s.toLowerCase());
  }));
  Object.entries(SKILL_SYNONYMS).forEach(([k, v]) => { if (t.includes(k.trim())) found.add(v); });
  const techPattern = /(pytorch|tensorflow|fastapi|terraform|docker|kubernetes|react|flutter|kafka|redis|postgres|mongodb|sklearn|numpy|pandas|llm|rag|bert|gpt|lstm|cnn|rnn|cv|nlp|rl|aws|gcp|azure|mlops|llmops|onnx|cuda|triton|vllm|langchain|huggingface)/g;
  const techMatches = t.match(techPattern) || [];
  techMatches.forEach(m => found.add(m));
  return [...found];
}

function queryRAG(skills, ragKB) {
  const enriched = enrichKBSkills(ragKB);
  const matched = []; const seen = new Set();
  skills.forEach(skill => {
    const sl = skill.toLowerCase();
    const aliases = SYNONYM_REVERSE[sl] || [];
    enriched.forEach(e => {
      if (seen.has(e.id)) return;
      const eSkills = e.skills.map(s => s.toLowerCase());
      const hits = eSkills.some(s =>
        s === sl || s.includes(sl) || sl.includes(s) ||
        aliases.some(a => s.includes(a) || a.includes(s))
      );
      if (hits) { matched.push({...e}); seen.add(e.id); }
    });
  });
  return matched;
}

const api = {
  async post(path, body) {
    const r = await fetch(`${PROXY}${path}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(body),
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.detail||`${path} ${r.status}`); }
    return r.json();
  },
  async get(path) {
    const r = await fetch(`${PROXY}${path}`);
    if (!r.ok) throw new Error(`${path} ${r.status}`);
    return r.json();
  },
  async postForm(path, formData) {
    const r = await fetch(`${PROXY}${path}`, { method:"POST", body: formData });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.detail||`${path} ${r.status}`); }
    return r.json();
  },
};

async function callGroq(system, user, model=MODELS.doc, jsonMode=false) {
  const d = await api.post("/generate", {system_prompt:system, user_prompt:user, model, json_mode:jsonMode});
  return d.content ?? "";
}

function buildResumeBody(profile, docData, ragSummary) {
  const s = docData.matched_skills || [];
  const phone = profile.countryCode && profile.phoneNumber
    ? `${profile.countryCode}-${profile.phoneNumber}` : (profile.phone||"");
  return {
    candidate_name: profile.name||"Candidate", phone,
    email_address: profile.email||"", linkedin: profile.linkedin||"",
    github: profile.github||"", college: profile.college||"",
    college_location: profile.location||"", degree: profile.degree||"",
    grad_year: profile.gradYear||"",
    job_title: docData.job_title||"Software Engineer",
    summary: docData.summary||ragSummary||"",
    experience: (docData.experience||[]).map(e=>({
      company: e.company||e.project, role: e.role, bullets: e.bullets,
      dates:"2023 -- Present", location: profile.location||"",
    })),
    projects:[],
    skills:{
      languages: s.filter(x=>["python","javascript","typescript","dart","java","c++","rust","go"].includes(x)).join(", ")||"Python, JavaScript",
      frameworks: s.filter(x=>["pytorch","tensorflow","react","fastapi","flutter","django","flask"].includes(x)).join(", ")||"PyTorch, FastAPI",
      tools: "Git, Docker, Terraform",
      platforms: s.filter(x=>["aws","cloud","gcp","azure","groq"].includes(x)).join(", ")||"AWS",
    },
  };
}

async function downloadTex(profile, docData, ragSummary) {
  const r = await fetch(`${PROXY}/generate-tex`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(buildResumeBody(profile, docData, ragSummary)),
  });
  if (!r.ok) throw new Error(`TeX ${r.status}`);
  const blob = new Blob([await r.text()], {type:"application/x-tex"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `resume_${(docData.job_title||"resume").slice(0,20).replace(/\s+/g,"_")}.tex`;
  a.click();
}

function downloadText(text, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type:"text/plain"}));
  a.download = filename; a.click();
}

const baseInp = {
  background:"#ffffff", border:"1px solid #d0d0c8", borderRadius:3,
  color:"#1a1a18", padding:"7px 9px", fontSize:10.5,
  fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box",
};

const Btn = ({onClick, disabled, children, color=C.green, bg=C.greenBg, style={}}) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding:"6px 14px", fontSize:10, letterSpacing:1, fontFamily:"inherit",
    background: disabled ? "transparent" : bg,
    border:`1px solid ${disabled ? C.border : color}`,
    borderRadius:3, color: disabled ? C.dim : color,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace:"nowrap", transition:"all 0.15s", ...style,
  }}>{children}</button>
);

function Tag({children, color=C.green, bg=C.greenBg, border=C.greenDim}) {
  return <span style={{display:"inline-block", padding:"2px 8px", borderRadius:2,
    fontSize:10, fontFamily:"monospace", letterSpacing:1,
    border:`1px solid ${border}`, background:bg, color}}>{children}</span>;
}
function StagePip({n, status}) {
  const c = status==="done"?C.green:status==="running"?C.amber:C.dim;
  return <div style={{display:"flex",alignItems:"center",gap:4,fontSize:9}}>
    <div style={{width:6,height:6,borderRadius:"50%",background:c,
      boxShadow:status==="running"?`0 0 7px ${C.amber}`:status==="done"?`0 0 4px ${C.green}44`:"none",
      transition:"all 0.3s"}}/>
    <span style={{color:c,letterSpacing:1.5}}>S{n}</span>
  </div>;
}
function EmptySlate({msg}) {
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",
    justifyContent:"center",height:"100%",gap:12,color:C.dim}}>
    <div style={{fontSize:24,opacity:0.3}}>⬡</div>
    <div style={{fontSize:11,textAlign:"center",maxWidth:260,lineHeight:1.7}}>
      {msg||"Run the pipeline to generate output."}
    </div>
  </div>;
}
function LogLine({ts, msg, type}) {
  const col = type==="header"?C.blue:type==="success"?C.green:type==="warn"?C.amber:type==="error"?C.red:C.text;
  if (type==="space") return <div style={{height:4}}/>;
  return <div style={{display:"flex",gap:8,lineHeight:1.7,fontSize:10.5}}>
    <span style={{color:C.dim,flexShrink:0,fontSize:9.5}}>[{ts}]</span>
    <span style={{color:col}}>{msg}</span>
  </div>;
}
function SectionLabel({children, style={}}) {
  return <div style={{color:C.dim,fontSize:8,letterSpacing:2.5,marginBottom:8,
    paddingBottom:5,borderBottom:`1px solid ${C.border}`,...style}}>{children}</div>;
}

const COUNTRY_CODES = [
  {code:"+91",label:"IN +91"},{code:"+1",label:"US +1"},{code:"+44",label:"UK +44"},
  {code:"+61",label:"AU +61"},{code:"+49",label:"DE +49"},{code:"+65",label:"SG +65"},
];

function scrubEmail(text) {
  if (!text) return text;
  const replacements = [
    [/cutting[- ]edge/gi,           "advanced"],
    [/valuable asset to (the )?team/gi, "strong fit for this role"],
    [/excited (about|to|for)/gi,    "interested in"],
    [/passionate (about|developer)/gi, "focused on"],
    [/I am writing to apply/gi,     "I am applying"],
    [/I believe my [\w\s,]+ align[s]? with/gi, "My experience directly addresses"],
    [/look forward to hearing from you/gi, "happy to discuss further"],
    [/at your (earliest )?convenience/gi, "at a time that works for you"],
    [/I would appreciate the (chance|opportunity) to/gi, "I'd like to"],
    [/would be a (great|perfect|good) fit/gi, "have the right background"],
    [/I am confident that/gi,       ""],
    [/please (do not|don't) hesitate to/gi, "feel free to"],
    [/\bsynergy\b/gi,               "alignment"],
    [/\bseamless(ly)?\b/gi,         "smooth"],
    [/\btransformative\b/gi,        "impactful"],
    [/\bdynamic\b/gi,               "fast-paced"],
    [/\blandscape\b/gi,             "space"],
    [/\btapestry\b/gi,              "mix"],
    [/\bspearheaded\b/gi,           "led"],
    [/\bdelve\b/gi,                 "explore"],
  ];
  let out = text;
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }
  out = out.replace(/  +/g, " ").replace(/ \./g, ".").trim();
  return out;
}
function ATSRing({score, grade}) {
  const c = score>=75?C.green:score>=55?C.amber:C.red;
  const r = 28, circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  return (
    <div style={{position:"relative",width:72,height:72,flexShrink:0}}>
      <svg width="72" height="72" style={{transform:"rotate(-90deg)"}}>
        <circle cx="36" cy="36" r={r} fill="none" stroke={C.border} strokeWidth="4"/>
        <circle cx="36" cy="36" r={r} fill="none" stroke={c} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{transition:"stroke-dasharray 0.8s ease"}}/>
      </svg>
      <div style={{position:"absolute",top:0,left:0,width:72,height:72,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{color:c,fontSize:15,fontWeight:700,letterSpacing:1}}>{score}</div>
        <div style={{color:c,fontSize:9,letterSpacing:1}}>{grade}</div>
      </div>
    </div>
  );
}

function ProfilePanel({profile, setProfile, ragKB, onScrape, scraping, collapsed, setCollapsed}) {
  const fields = [
    {key:"name",     label:"NAME",     placeholder:"Your Name"},
    {key:"email",    label:"EMAIL",    placeholder:"contact@email.com  (resume header only — not Gmail sender)"},
    {key:"linkedin", label:"LINKEDIN", placeholder:"handle after linkedin.com/in/  e.g. aayu-dev"},
    {key:"college",  label:"COLLEGE",  placeholder:"University Name"},
    {key:"degree",   label:"DEGREE",   placeholder:"B.Sc Computer Science"},
    {key:"gradYear", label:"GRAD YEAR",placeholder:"2025"},
    {key:"location", label:"LOCATION", placeholder:"City, Country"},
  ];
  const ROW = {display:"flex",alignItems:"center",gap:8};
  const LBL = {color:C.dim,fontSize:8,letterSpacing:1.5,width:68,flexShrink:0};
  return (
    <div style={{borderBottom:`1px solid ${C.border}`,flexShrink:1,minHeight:0}}>
      <button onClick={()=>setCollapsed(!collapsed)} style={{
        width:"100%",padding:"7px 14px",background:"transparent",border:"none",
        display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
        <span style={{color:C.dim,fontSize:9,letterSpacing:2}}>USER_PROFILE</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {ragKB.length>0 && <span style={{color:C.green,fontSize:9}}>{ragKB.length} KB entries</span>}
          {profile.name && <span style={{color:C.text,fontSize:9}}>{profile.name}</span>}
          <span style={{color:C.dim,fontSize:10}}>{collapsed?"▾":"▴"}</span>
        </div>
      </button>
      {!collapsed && (
        <div style={{padding:"8px 14px 12px",overflowY:"auto",maxHeight:"42vh"}}>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
            {fields.map(f=>(
              <div key={f.key} style={ROW}>
                <div style={LBL}>{f.label}</div>
                <input value={profile[f.key]||""} placeholder={f.placeholder}
                  onChange={e=>setProfile(p=>({...p,[f.key]:e.target.value}))}
                  style={{...baseInp,flex:1}}/>
              </div>
            ))}
            <div style={ROW}>
              <div style={LBL}>PHONE</div>
              <select value={profile.countryCode||"+91"}
                onChange={e=>setProfile(p=>({...p,countryCode:e.target.value}))}
                style={{...baseInp,width:80,flex:"none",cursor:"pointer"}}>
                {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <input value={profile.phoneNumber||""} placeholder="9999999999" maxLength={12}
                onChange={e=>setProfile(p=>({...p,phoneNumber:e.target.value.replace(/\D/g,"").slice(0,12)}))}
                style={{...baseInp,flex:1}}/>
            </div>
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            <div style={{color:C.dim,fontSize:8,letterSpacing:2,marginBottom:4}}>
              GITHUB — scraped automatically when you run the pipeline
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input value={profile.github||""} placeholder="github-username"
                onChange={e=>setProfile(p=>({...p,github:e.target.value}))}
                style={{...baseInp,flex:1}}/>
              {scraping && (
                <span style={{fontSize:9,color:C.amber,letterSpacing:1}}>SCRAPING...</span>
              )}
              {!scraping && ragKB.length>0 && (
                <span style={{fontSize:9,color:C.green,letterSpacing:1}}>✓ {ragKB.length} KB</span>
              )}
            </div>
            {ragKB.length>0 && (
              <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                {ragKB.map(e=>(
                  <span key={e.id} style={{fontSize:9,padding:"2px 6px",borderRadius:2,
                    border:`1px solid ${C.greenDim}`,background:C.greenBg,color:C.green,
                    fontFamily:"monospace"}}>{e.label}</span>
                ))}
              </div>
            )}
            <div style={{marginTop:5,color:C.dim,fontSize:8,fontStyle:"italic"}}>
              scraped fresh on each run, JD-aware — best matching repos are selected
            </div>
          </div>

          
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4}}>
            <div style={{color:C.dim,fontSize:8,letterSpacing:2,marginBottom:4}}>
              MANUAL EXPERIENCE <span style={{color:C.dim,fontStyle:"italic",letterSpacing:0}}>— paste bullets if no GitHub, or any field (marketing, finance, design)</span>
            </div>
            <textarea
              value={profile.manualKB||""}
              onChange={e=>setProfile(p=>({...p,manualKB:e.target.value}))}
              placeholder={"• Built email campaigns that grew open rates from 18% to 31%\n• Managed ₹40L Google Ads budget across 3 product lines\n• Led rebranding project across 4 regional markets"}
              style={{...baseInp,height:70,resize:"none",lineHeight:1.6,fontSize:10,
                fontFamily:"inherit",padding:"7px 9px"}}
            />
            {profile.manualKB?.trim() && (
              <div style={{marginTop:4,fontSize:9,color:C.green}}>
                ✓ {profile.manualKB.trim().split("\n").filter(l=>l.trim().length>5).length} experience lines will be injected into pipeline
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResumeView({data, atsData, atsLoading, profile, ragSummary, addLog}) {
  const [tab, setTab] = useState("resume");
  const [dlTex, setDlTex] = useState(false);

  const handleTex = async () => {
    if (!data) return; setDlTex(true);
    try { await downloadTex(profile, data, ragSummary); addLog("resume.tex downloaded ✓","success"); }
    catch(e) { addLog(`TeX error: ${e.message}`,"error"); }
    setDlTex(false);
  };

  if (!data) return <EmptySlate/>;
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,flexShrink:0,flexWrap:"wrap"}}>
        {["resume","ats"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"4px 12px",fontSize:10,letterSpacing:1,fontFamily:"inherit",
            background:tab===t?C.green:"transparent",
            color:tab===t?C.bg:C.dim,
            border:`1px solid ${tab===t?C.green:C.border}`,borderRadius:2,cursor:"pointer",
          }}>
            {t==="ats"
              ? atsData ? `ATS ${atsData.score}/100 ${atsData.grade}` : "ATS SCORE"
              : "RESUME"}
          </button>
        ))}
        <Btn onClick={handleTex} disabled={dlTex} style={{marginLeft:"auto"}}>
          {dlTex?"GENERATING...":"⬇ DOWNLOAD .tex"}
        </Btn>
        <span style={{color:C.dim,fontSize:9}}>
          → <a href="https://overleaf.com" target="_blank" rel="noreferrer"
               style={{color:C.blue,textDecoration:"none"}}>Overleaf</a> → PDF
        </span>
      </div>

      <div style={{flex:1,overflowY:"auto"}}>
        
        {tab==="resume" && (
          <div style={{maxWidth:640}}>
            <div style={{borderBottom:`1px solid ${C.green}30`,paddingBottom:12,marginBottom:18}}>
              <div style={{color:C.green,fontSize:18,fontWeight:700,letterSpacing:3}}>
                {(profile.name||"CANDIDATE").toUpperCase()}
              </div>
              <div style={{color:C.dim,fontSize:11,marginTop:2}}>
                {data.job_title}{profile.location?` · ${profile.location}`:""}
                {profile.github && <span style={{color:C.blue,marginLeft:10,fontSize:10}}>
                  github.com/{profile.github}</span>}
              </div>
              <div style={{color:C.amber,fontSize:12,marginTop:8,fontStyle:"italic",lineHeight:1.7}}>
                {data.summary}
              </div>
            </div>

            <SectionLabel>EXPERIENCE</SectionLabel>
            {data.experience?.map((exp,i)=>(
              <div key={i} style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
                  <span style={{color:C.heading,fontSize:13}}>{exp.company||exp.project}</span>
                  <span style={{color:C.dim,fontSize:10,fontStyle:"italic"}}>{exp.role}</span>
                </div>
                {exp.bullets?.map((b,j)=>{
                  const wc=b.trim().split(/\s+/).length;
                  return <div key={j} style={{display:"flex",gap:8,marginBottom:4,alignItems:"flex-start"}}>
                    <span style={{color:wc<10?C.red:C.green,flexShrink:0,marginTop:2,fontSize:9}}>▸</span>
                    <span style={{color:C.text,fontSize:12,lineHeight:1.7,flex:1}}>{b}</span>
                    <span style={{fontSize:8,flexShrink:0,marginTop:4,
                      color:wc<10?C.red:wc<15?C.amber:C.dim,fontWeight:wc<10?700:"normal"}}>
                      {wc<10?"⚠ "+wc+"w":wc+"w"}
                    </span>
                  </div>;
                })}
              </div>
            ))}

            {data.matched_skills?.length>0 && <>
              <SectionLabel>MATCHED SKILLS</SectionLabel>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:16}}>
                {data.matched_skills.map(s=><Tag key={s}>{s}</Tag>)}
              </div>
            </>}
            {data.missing_skills?.length>0 && <>
              <SectionLabel>NOT IN YOUR PROJECTS — OMITTED</SectionLabel>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {data.missing_skills.map(s=><Tag key={s} color={C.red} bg={C.redBg} border="#f0b0b0">{s}</Tag>)}
              </div>
            </>}
          </div>
        )}

        
        {tab==="ats" && (
          atsLoading ? (
            <div style={{color:C.amber,fontSize:11,padding:20}}>
              Running ATS check against job description...
            </div>
          ) : !atsData ? (
            <EmptySlate msg="ATS score will appear here after pipeline runs."/>
          ) : (
            <div style={{maxWidth:640}}>
              
              <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:24,
                padding:"16px 20px",background:"#f4f4f0",border:`1px solid ${C.border}`,borderRadius:3}}>
                <ATSRing score={atsData.score} grade={atsData.grade}/>
                <div style={{flex:1}}>
                  <div style={{color:C.heading,fontSize:13,marginBottom:4}}>ATS Compatibility Score</div>
                  <div style={{color:C.text,fontSize:12,lineHeight:1.7}}>{atsData.summary}</div>
                </div>
              </div>

              
              {atsData.keyword_hits?.length>0 && (
                <div style={{marginBottom:16}}>
                  <SectionLabel>KEYWORDS FOUND ✓</SectionLabel>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {atsData.keyword_hits.map(k=><Tag key={k}>{k}</Tag>)}
                  </div>
                </div>
              )}

              
              {atsData.keyword_misses?.length>0 && (
                <div style={{marginBottom:16}}>
                  <SectionLabel>MISSING KEYWORDS ✗</SectionLabel>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {atsData.keyword_misses.map(k=>(
                      <Tag key={k} color={C.red} bg={C.redBg} border="#f0b0b0">{k}</Tag>
                    ))}
                  </div>
                </div>
              )}

              
              {atsData.weak_bullets?.length>0 && (
                <div style={{marginBottom:16}}>
                  <SectionLabel>WEAK BULLETS — TOO GENERIC</SectionLabel>
                  {atsData.weak_bullets.map((b,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start",
                      padding:"8px 12px",background:C.redBg,border:`1px solid #f0b0b0`,borderRadius:2}}>
                      <span style={{color:C.red,fontSize:10,flexShrink:0,marginTop:1}}>✗</span>
                      <span style={{color:C.text,fontSize:11,lineHeight:1.6}}>{b}</span>
                    </div>
                  ))}
                </div>
              )}

              
              {atsData.strong_bullets?.length>0 && (
                <div style={{marginBottom:16}}>
                  <SectionLabel>STRONG BULLETS ✓</SectionLabel>
                  {atsData.strong_bullets.map((b,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start",
                      padding:"8px 12px",background:C.greenBg,border:`1px solid ${C.greenDim}`,borderRadius:2}}>
                      <span style={{color:C.green,fontSize:10,flexShrink:0,marginTop:1}}>✓</span>
                      <span style={{color:C.text,fontSize:11,lineHeight:1.6}}>{b}</span>
                    </div>
                  ))}
                </div>
              )}

              
              {atsData.suggestions?.length>0 && (
                <div>
                  <SectionLabel>ACTIONABLE FIXES</SectionLabel>
                  {atsData.suggestions.map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start",
                      padding:"8px 12px",background:"#f4f4f0",border:`1px solid ${C.border}`,borderRadius:2}}>
                      <span style={{color:C.amber,fontSize:10,flexShrink:0,marginTop:1}}>{i+1}.</span>
                      <span style={{color:C.text,fontSize:11,lineHeight:1.6}}>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function EmailView({data, profile, docData, jd, ragCtx, emailStyle, setEmailStyle, companyResearch=null,
  emailText, setEmailText, emailSubject, setEmailSubject,
  demoMode=false, demoEmailOverride="", setDemoEmailOverride=()=>{}}) {
  const [recipient,    setRecipient]    = useState("");
  const [sending,      setSending]      = useState(false);
  const [sent,         setSent]         = useState(null);
  const [err,          setErr]          = useState("");
  const [regen,        setRegen]        = useState(false);
  const [regenErr,     setRegenErr]     = useState("");

  if (!data) return <EmptySlate/>;
  const wc = (emailText||"").trim().split(/\s+/).filter(Boolean).length;

  const regenerateEmail = async () => {
    if (!docData) return;
    setRegen(true); setRegenErr("");
    const selectedStyle = EMAIL_STYLES.find(s=>s.id===emailStyle);
    const fewShotBlock  = selectedStyle?.sample
      ? `\nFEW-SHOT EMAIL EXAMPLE (match this tone and style exactly):\n---\n${selectedStyle.sample}\n---\n`
      : "";
    const sys = `You are a professional email writer. Output ONLY valid JSON — no markdown, no preamble.
CANDIDATE: ${profile?.name||"Candidate"}
${docData.company ? `HIRING COMPANY: ${docData.company}` : "HIRING COMPANY: unknown — refer to 'this role' or 'your team', do NOT invent a name."}
FORBIDDEN words/phrases — do NOT use any of these:
delve, spearheaded, testament, tapestry, transformative, dynamic, cutting-edge, synergy, seamless, landscape,
"I am excited", "valuable asset", "look forward to hearing", "at your earliest convenience",
"I believe my experience aligns", "would be a great fit", "I am confident that", "please do not hesitate",
"passionate about", "I am writing to apply".
${fewShotBlock}
EMAIL: STRICT MINIMUM 300 words. EXACTLY 4 paragraphs separated by a blank line.
Para 1 (~60w): Role + specific reason for THIS company from the JD.
Para 2 (~100w): Most relevant project — name architecture/dataset/constraint specifically.
Para 3 (~100w): Second project/skill connected to a named JD requirement.
Para 4 (~60w): Confident next-step ask.
Do NOT start with "I am writing to apply". Direct human tone.
Return exactly: {"subject":"specific subject line","email":"full 4-paragraph email text"}`;
    try {
      const raw = await callGroq(sys,
        `JD:\n${jd||docData.email||""}\n\nCANDIDATE KB:\n${ragCtx||""}\n\nJob title: ${docData.job_title||""}`,
        MODELS.doc, true);
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setEmailText(scrubEmail(parsed.email||""));
      setEmailSubject(parsed.subject||emailSubject);
    } catch(e) { setRegenErr(e.message); }
    setRegen(false);
  };

  const handleSend = async (overrideEmail) => {
    const email = overrideEmail || recipient.trim();
    if (!email) return;
    setSending(true); setErr(""); setSent(null);
    try {
      const result = await api.post("/send-email", {
        recipient_email: email,
        subject: emailSubject||`Application for ${docData?.job_title||"the role"}`,
        email_body: emailText,
        candidate_name: profile?.name||"Candidate",
        job_title: docData?.job_title||"",
        company: docData?.company||"",
      });
      setSent(result);
    } catch(e) { setErr(e.message); }
    setSending(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(emailText).catch(()=>{});
  };

  return (
    <div style={{maxWidth:640}}>
      
      <div style={{marginBottom:12}}>
        <SectionLabel>EMAIL STYLE / TONE GUIDE</SectionLabel>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={emailStyle}
            onChange={e=>setEmailStyle(e.target.value)}
            style={{...baseInp,fontSize:10,flex:1}}>
            {EMAIL_STYLES.map(s=>(
              <option key={s.id} value={s.id}>{s.label} — {s.hint}</option>
            ))}
          </select>
          <Btn onClick={regenerateEmail} disabled={regen||!docData}
            color={C.purple} bg={C.purpleBg}>
            {regen?"GENERATING...":"↻ REGENERATE"}
          </Btn>
        </div>
        {regenErr && <div style={{color:C.red,fontSize:9,marginTop:4}}>✗ {regenErr}</div>}
      </div>

      
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
        <span style={{color:C.dim,fontSize:9,letterSpacing:2}}>OUTREACH_EMAIL</span>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:wc>=250?C.green:C.amber,fontSize:9}}>{wc} words</span>
          <button onClick={handleCopy} style={{fontSize:9,color:C.dim,background:"transparent",
            border:`1px solid ${C.border}`,padding:"2px 8px",borderRadius:2,
            cursor:"pointer",fontFamily:"inherit"}}>COPY</button>
        </div>
      </div>

      
      {emailSubject && (
        <div style={{marginBottom:10,padding:"7px 12px",background:"#f4f4f0",
          border:`1px solid ${C.border}`,borderRadius:3,fontSize:11}}>
          <span style={{color:C.dim}}>Subject: </span>
          <span style={{color:C.amber}}>{emailSubject}</span>
        </div>
      )}

      
      {companyResearch?.context && (
        <div style={{marginBottom:12,padding:"10px 14px",background:C.blueDim,
          border:`1px solid ${C.blue}22`,borderLeft:`3px solid ${C.blue}`,borderRadius:3}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:C.blue}}/>
            <span style={{color:C.blue,fontSize:8,letterSpacing:2}}>COMPANY RESEARCH AGENT</span>
            <span style={{color:C.dim,fontSize:8,marginLeft:"auto"}}>
              {companyResearch.source==="web"?"live web":companyResearch.source==="jd_inference"?"inferred from JD":"fallback"}
            </span>
          </div>
          <div style={{color:C.text,fontSize:11,lineHeight:1.7,marginBottom:6}}>
            {companyResearch.context}
          </div>
          {companyResearch.signals?.length>0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:5}}>
              {companyResearch.signals.slice(0,3).map((s,i)=>(
                <span key={i} style={{fontSize:9,padding:"2px 7px",borderRadius:2,
                  border:`1px solid ${C.blue}44`,color:C.blue,background:"#fff8"}}>
                  {s.slice(0,60)}{s.length>60?"...":""}
                </span>
              ))}
            </div>
          )}
          <div style={{fontSize:8,color:C.dim}}>
            Searched: {companyResearch.search_queries?.join(" · ")}
          </div>
        </div>
      )}

      
      <div style={{background:"#f4f4f0",
        border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.green}`,
        borderRadius:3,padding:"18px 22px",
        fontSize:13,lineHeight:2.2,color:C.text,whiteSpace:"pre-wrap",
        fontFamily:"Georgia,serif",marginBottom:14,textAlign:"left"}}>
        {emailText}
      </div>

      
      {sent ? (
        <div style={{padding:"12px 16px",background:C.greenBg,border:`1px solid ${C.greenDim}`,borderRadius:3}}>
          <div style={{color:C.green,fontSize:11,marginBottom:3}}>✓ Sent via Gmail</div>
          <div style={{color:C.dim,fontSize:9}}>
            Follow-up scheduled: {new Date(sent.follow_up_scheduled_at).toLocaleString()} (72h auto-send)
          </div>
        </div>
      ) : (
        <div style={{background:"#f0f0ea",border:"1px solid #d0d0c8",borderRadius:3,padding:"12px 14px"}}>
          <SectionLabel>SEND VIA GMAIL</SectionLabel>

          
          {demoMode && (
            <div style={{marginBottom:10,padding:"8px 10px",background:C.amberBg,
              border:`1px solid ${C.amberDim}`,borderRadius:2}}>
              <div style={{color:C.amber,fontSize:8,letterSpacing:2,marginBottom:5}}>DEMO — SEND TO YOUR OWN GMAIL</div>
              <div style={{color:"#7a5020",fontSize:9,marginBottom:6,lineHeight:1.6}}>
                Email goes to YOU, not the company. Safe for live demos.
              </div>
              <input value={demoEmailOverride}
                onChange={e=>setDemoEmailOverride(e.target.value)}
                placeholder="your.own@gmail.com"
                style={{...baseInp,borderColor:C.amberDim}}
              />
            </div>
          )}

          <div style={{marginBottom:4,fontSize:9,color:"#909088",lineHeight:1.6}}>
            {demoMode
              ? "Recipient below auto-fills from your override address above."
              : "Recipient email — who receives the outreach. Your profile email is for the resume header only."}
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <input
              value={demoMode&&demoEmailOverride ? demoEmailOverride : recipient}
              onChange={e=>{ if(demoMode&&demoEmailOverride) return; setRecipient(e.target.value); }}
              onKeyDown={e=>e.key==="Enter"&&handleSend()}
              placeholder={demoMode?"auto-filled from override above":"recruiter@company.com"}
              readOnly={demoMode&&!!demoEmailOverride}
              style={{...baseInp,flex:1,opacity:demoMode&&demoEmailOverride?0.6:1}}
            />
            <Btn
              onClick={()=>handleSend(demoMode && demoEmailOverride ? demoEmailOverride : undefined)}
              disabled={sending||(demoMode ? !demoEmailOverride : !recipient.trim())}>
              {sending?"SENDING...":"▶ SEND"}
            </Btn>
          </div>
          {err && <div style={{color:C.red,fontSize:10}}>✗ {err}</div>}
          <div style={{color:C.dim,fontSize:9,marginTop:6,lineHeight:1.6}}>
            Requires Gmail OAuth — run{" "}
            <a href={`${PROXY}/auth/gmail`} target="_blank" rel="noreferrer"
               style={{color:C.blue,textDecoration:"none"}}>/auth/gmail</a>
            {" "}once. Gmail sender = whoever authenticated OAuth (not your profile email). Follow-up auto-sends at 72h if no reply.
          </div>
        </div>
      )}
    </div>
  );
}

function CoverLetterView({docData, ragCtx, jd, profile, ragSummary, coverText, setCoverText, coverSubject, setCoverSubject}) {
  const [generating, setGenerating] = useState(false);
  const [err,        setErr]        = useState("");

  const generate = async () => {
    if (!docData) return;
    setGenerating(true); setErr(""); setCoverText(""); setCoverSubject("");
    try {
      const result = await api.post("/generate-cover-letter", {
        candidate_name: profile?.name||"Candidate",
        job_title:      docData.job_title||"",
        company:        docData.company||"the company",
        jd_text:        jd||"",
        rag_context:    ragCtx||ragSummary||"",
        resume_summary: docData.summary||"",
        email_address:  profile?.email||"",
        phone:          profile?.countryCode&&profile?.phoneNumber
                          ? `${profile.countryCode}-${profile.phoneNumber}` : "",
        linkedin:       profile?.linkedin||"",
      });
      setCoverText(result.text||""); setCoverSubject(result.subject||"");
    } catch(e) { setErr(e.message); }
    setGenerating(false);
  };

  const handleDownload = () => {
    if (!coverText) return;
    downloadText(coverText, `cover_letter_${(docData?.job_title||"role").slice(0,20).replace(/\s+/g,"_")}.txt`);
  };

  return (
    <div style={{maxWidth:640}}>
      
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,
        paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
        <SectionLabel style={{margin:0}}>COVER_LETTER.txt</SectionLabel>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {coverText && <Btn onClick={handleDownload}>⬇ DOWNLOAD .txt</Btn>}
          <Btn onClick={generate} disabled={generating||!docData}
            color={C.purple} bg={C.purpleBg}>
            {generating?"GENERATING...":coverText?"↻ REGENERATE":"▶ GENERATE"}
          </Btn>
        </div>
      </div>

      
      {!docData && <EmptySlate msg="Run the pipeline first to generate a cover letter."/>}
      {docData && !coverText && !generating && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",padding:40,gap:16,color:C.dim}}>
          <div style={{fontSize:24,opacity:0.3}}>✉</div>
          <div style={{fontSize:11,textAlign:"center",maxWidth:260,lineHeight:1.7}}>
            Click Generate to create a formal 4-paragraph cover letter grounded in your GitHub projects.
          </div>
          <Btn onClick={generate} color={C.purple} bg={C.purpleBg}>▶ GENERATE COVER LETTER</Btn>
        </div>
      )}

      
      {generating && (
        <div style={{color:C.amber,fontSize:11,padding:20}}>
          Writing cover letter from your project context...
        </div>
      )}
      {err && <div style={{color:C.red,fontSize:11,padding:10}}>✗ {err}</div>}

      
      {coverText && (
        <>
          {coverSubject && (
            <div style={{marginBottom:10,padding:"7px 12px",background:"#f4f4f0",
              border:`1px solid ${C.border}`,borderRadius:3,fontSize:11}}>
              <span style={{color:C.dim}}>Subject: </span>
              <span style={{color:C.amber}}>{coverSubject}</span>
            </div>
          )}
          <div style={{background:"#f4f4f0",
            border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.purple}`,
            borderRadius:3,padding:"20px 24px",
            fontSize:13,lineHeight:2.2,color:C.text,whiteSpace:"pre-wrap",
            fontFamily:"Georgia,serif"}}>
            {coverText}
          </div>
        </>
      )}
    </div>
  );
}

function AudioInterviewView({ready, docData, jd, profile}) {
  const [lang,       setLang]       = useState("hi-IN");
  const [speaker,    setSpeaker]    = useState("anushka");
  const [msgs,       setMsgs]       = useState([]);
  const [recording,  setRecording]  = useState(false);
  const [processing, setProcessing] = useState(false);
  const [started,    setStarted]    = useState(false);
  const [textInp,    setTextInp]    = useState("");
  const [useText,    setUseText]    = useState(false);
  const mediaRef   = useRef(null);
  const chunksRef  = useRef([]);
  const audioRef   = useRef(null);
  const endRef     = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const sysPrompt = `You are a senior technical interviewer conducting a real job interview.
Role: ${docData?.job_title||"Software Engineer"} position
Candidate: ${profile?.name||"the candidate"}
Language: ${SARVAM_LANGUAGES.find(l=>l.code===lang)?.label||"Hindi"}

CANDIDATE'S ACTUAL PROJECTS (from GitHub):
${docData?.experience?.map(e=>`- ${e.company||e.project}: ${e.bullets?.slice(0,2).join("; ")}`).join("\n")||""}

JD CONTEXT: ${jd?.slice(0,400)||""}

HOW A REAL INTERVIEWER RESPONDS — follow this exactly:

WHEN ANSWER IS CORRECT OR GOOD:
- Briefly acknowledge it. Then go deeper or move to next topic.
- Examples: "That's right — AdamW handles weight decay differently than Adam. Now tell me..."
- "Correct. You used character-level tokenisation — what's the trade-off versus BPE in sequence length?"
- Never just say "correct" and stop. Always follow with a harder follow-up.

WHEN ANSWER IS PARTIALLY RIGHT:
- Acknowledge the correct part, correct the wrong part, then probe further.
- Example: "You're right that Q-learning is off-policy, but temporal difference doesn't require a model. How does that affect your implementation?"

WHEN ANSWER IS WRONG:
- Correct them directly. Don't be harsh, just factual.
- Example: "Not quite — backpropagation doesn't update weights directly, it just computes gradients. The optimizer does the update. What optimizer did you use in micrograd?"

WHEN ANSWER IS "I DON'T KNOW":
- Do NOT rephrase the same question. Do NOT accept it.
- Point to their own project: "You built this — walk me through what your code actually does."
- Example: "You wrote ReinforceJS. Q-learning is in your own file. Open it mentally — what does the update function do?"
- If they say it twice: "In a real interview this would end the call. Let's try a simpler angle — what is a reward function?"

STRICT RULES:
1. You are ONLY the interviewer. NEVER write "Candidate:" or simulate their answer.
2. ONE response per turn: acknowledge + one follow-up question.
3. Respond ONLY in ${SARVAM_LANGUAGES.find(l=>l.code===lang)?.label||"Hindi"}.
4. Keep it under 3 sentences total. Sharp, conversational, real.
5. No bullet points in your response. Talk like a human interviewer.`;

  const speak = async (text) => {
    if (!text) return;
    try {
      const res = await api.post("/sarvam/tts", {
        text: text.slice(0,500), language_code: lang, speaker, model:"bulbul:v2"
      });
      if (res.audio_b64) {
        const bytes = atob(res.audio_b64);
        const arr   = new Uint8Array(bytes.length);
        for (let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
        const blob  = new Blob([arr], {type:"audio/wav"});
        const url   = URL.createObjectURL(blob);
        if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
        audioRef.current = new Audio(url);
        audioRef.current.play().catch(()=>{});
      }
    } catch(e) { console.warn("TTS failed:",e.message); }
  };

  const getInterviewerResponse = async (history) => {
    const messages = history.map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
    const withReminder = [
      ...messages,
      { role: "user", content: "[Remember: respond ONLY as the interviewer with ONE question. Do not write Candidate: or answer for the candidate.]" }
    ];
    const lastUser = messages.filter(m => m.role === "user").pop()?.content || "";
    const reminderMsg = `[The candidate just said: "${lastUser.slice(0,300)}"] Now ask your next probing question. ONE question only. Do NOT simulate the candidate's answer.`;
    return callGroq(sysPrompt, reminderMsg, MODELS.interview);
  };

  const beginInterview = async () => {
    setProcessing(true);
    try {
      const text = await callGroq(sysPrompt, "Begin the interview in the selected language.", MODELS.interview);
      const m    = [{role:"assistant",content:text}];
      setMsgs(m); setStarted(true);
      await speak(text);
    } catch(e) { console.error(e); }
    setProcessing(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType = MediaRecorder.isTypeSupported("audio/wav")
        ? "audio/wav"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, {mimeType});
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size>0) chunksRef.current.push(e.data); };
      mr.start(100);
      mediaRef.current = mr; setRecording(true);
      setTimeout(() => { if (mediaRef.current?.state === "recording") stopRecording(); }, 30000);
    } catch(e) { alert("Microphone access denied: "+e.message); }
  };

  const stopRecording = async () => {
    setRecording(false); setProcessing(true);
    const mr = mediaRef.current;
    if (!mr) { setProcessing(false); return; }

    await new Promise(r => {
      mr.ondataavailable = e => { if (e.data.size>0) chunksRef.current.push(e.data); r(); };
      mr.requestData();
      setTimeout(r, 300); // fallback if requestData doesn't fire
    });

    mr.stop();
    mr.stream.getTracks().forEach(t=>t.stop());
    await new Promise(r=>{ mr.onstop=r; });

    const mimeType = mr.mimeType || "audio/webm";
    const ext      = mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : "webm";
    const blob     = new Blob(chunksRef.current, {type: mimeType});

    if (blob.size < 1000) {
      setProcessing(false); return;
    }

    const arrayBuf = await blob.arrayBuffer();
    const uint8    = new Uint8Array(arrayBuf);
    let binary = "";
    uint8.forEach(b => binary += String.fromCharCode(b));
    const audio_b64 = btoa(binary);

    try {
      const stt = await api.post("/sarvam/stt", {
        audio_b64,
        language_code: lang,
        model: "saarika:v2.5",
        filename: `recording.${ext}`,
      });
      const transcript = stt.transcript||"";
      if (!transcript.trim()) { setProcessing(false); return; }
      const userMsg  = {role:"user", content:transcript};
      const history  = [...msgs, userMsg];
      setMsgs(history);
      const response = await getInterviewerResponse(history);
      const next     = [...history, {role:"assistant", content:response}];
      setMsgs(next);
      await speak(response);
    } catch(e) {
      setMsgs([...history, {role:"assistant", content:`[Error: ${e.message}]`}]);
    }
    setProcessing(false);
  };

  const sendText = async () => {
    if (!textInp.trim()||processing) return;
    const userMsg  = {role:"user", content:textInp};
    const history  = [...msgs, userMsg];
    setMsgs(history); setTextInp(""); setProcessing(true);
    try {
      const response = await getInterviewerResponse(history);
      const next     = [...history, {role:"assistant", content:response}];
      setMsgs(next);
      await speak(response);
    } catch(e) {
      setMsgs([...history, {role:"assistant", content:`[Error: ${e.message}]`}]);
    }
    setProcessing(false);
  };

  if (!ready) return <EmptySlate msg="Complete the pipeline first to unlock the audio interview."/>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      
      <div style={{flexShrink:0,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${C.border}`,
        display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{color:C.dim,fontSize:9,letterSpacing:1.5}}>LANGUAGE</span>
          <select value={lang} onChange={e=>setLang(e.target.value)}
            style={{...baseInp,width:130,fontSize:10}}>
            {SARVAM_LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{color:C.dim,fontSize:9,letterSpacing:1.5}}>SPEAKER</span>
          <select value={speaker} onChange={e=>setSpeaker(e.target.value)}
            style={{...baseInp,width:100,fontSize:10}}>
            {SARVAM_SPEAKERS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={()=>setUseText(!useText)} style={{fontSize:9,color:C.dim,
          background:"transparent",border:`1px solid ${C.border}`,padding:"4px 10px",
          borderRadius:2,cursor:"pointer",fontFamily:"inherit",marginLeft:"auto"}}>
          {useText?"🎤 use mic":"⌨ type instead"}
        </button>
        {msgs.length>0&&<button onClick={()=>{setMsgs([]);setStarted(false);}}
          style={{fontSize:9,color:C.dim,background:"transparent",border:`1px solid ${C.border}`,
            padding:"4px 10px",borderRadius:2,cursor:"pointer",fontFamily:"inherit"}}>RESET</button>}
      </div>

      
      <div style={{flexShrink:0,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:4,height:4,borderRadius:"50%",background:C.purple}}/>
        <span style={{color:C.dim,fontSize:9}}>Powered by Sarvam AI · Saarika v2.5 STT · Bulbul v2 TTS</span>
      </div>

      
      <div style={{flex:1,overflowY:"auto",marginBottom:12}}>
        {!started ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",height:"100%",gap:16}}>
            <div style={{color:C.dim,fontSize:11,textAlign:"center",lineHeight:1.8}}>
              Interview will be conducted in{" "}
              <span style={{color:C.text}}>{SARVAM_LANGUAGES.find(l=>l.code===lang)?.label}</span>.
              <br/>
              <span style={{fontSize:10,opacity:0.6}}>
                Hard technical questions about your actual GitHub projects.
              </span>
            </div>
            <Btn onClick={beginInterview} disabled={processing}
              color={C.purple} bg={C.purpleBg} style={{padding:"10px 28px",fontSize:11,letterSpacing:2}}>
              {processing?"INITIALIZING...":"▶ BEGIN INTERVIEW"}
            </Btn>
          </div>
        ) : msgs.map((m,i)=>(
          <div key={i} style={{marginBottom:10,padding:"10px 14px",borderRadius:3,
            background:m.role==="user"?"#eef2ff":"#f8f4ff",
            border:`1px solid ${m.role==="user"?C.blueDim:"#e8e0fe"}`,
            borderLeft:`3px solid ${m.role==="user"?C.blue:C.purple}`}}>
            <div style={{color:m.role==="user"?C.blue:C.purple,fontSize:8,letterSpacing:2,marginBottom:5}}>
              {m.role==="user"?"▶ YOU":"◀ INTERVIEWER"}
            </div>
            <div style={{fontSize:12,lineHeight:1.9,color:C.text}}>{m.content}</div>
          </div>
        ))}
        {processing&&started&&(
          <div style={{color:C.amber,fontSize:10,padding:"6px 0"}}>
            Processing<span style={{animation:"blink 0.8s infinite"}}>...</span>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      
      {started && (
        useText ? (
          <div style={{display:"flex",gap:8,flexShrink:0,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
            <input value={textInp} onChange={e=>setTextInp(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&sendText()}
              placeholder="Type your answer..."
              style={{...baseInp,flex:1}}/>
            <Btn onClick={sendText} disabled={processing||!textInp.trim()}
              color={C.purple} bg={C.purpleBg}>SEND</Btn>
          </div>
        ) : (
          <div style={{flexShrink:0,paddingTop:8,borderTop:`1px solid ${C.border}`,
            display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={processing}
              style={{
                width:60,height:60,borderRadius:"50%",cursor:processing?"not-allowed":"pointer",
                background:recording?"#fef2f2":C.purpleBg,
                border:`2px solid ${recording?C.red:C.purple}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:20,transition:"all 0.15s",
                boxShadow:recording?`0 0 16px ${C.red}44`:"none",
              }}>
              {recording?"⏹":"🎤"}
            </button>
            <span style={{color:C.dim,fontSize:9,letterSpacing:1}}>
              {processing?"processing...":recording?"release to send":"hold to speak"}
            </span>
          </div>
        )
      )}
    </div>
  );
}

function ThreadsView() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const load = async () => {
    setLoading(true); setErr("");
    try { setThreads((await api.get("/email-threads")).threads||[]); }
    catch(e) { setErr(e.message); }
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);
  const SC = {sent:C.amber,followed_up:C.blue,replied:C.green,closed:C.dim};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:14,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
        <SectionLabel style={{margin:0}}>EMAIL_THREADS</SectionLabel>
        <Btn onClick={load} disabled={loading} style={{padding:"3px 10px",fontSize:9}}>REFRESH</Btn>
      </div>
      {loading&&<div style={{color:C.dim,fontSize:11}}>Loading...</div>}
      {err&&<div style={{color:C.red,fontSize:11}}>{err}</div>}
      {!loading&&!err&&threads.length===0&&(
        <EmptySlate msg="No threads yet. Send an outreach email to start tracking."/>
      )}
      {threads.map((t,i)=>(
        <div key={i} style={{marginBottom:10,padding:"12px 14px",borderRadius:3,
          background:"#f4f4f0",border:`1px solid ${C.border}`,
          borderLeft:`3px solid ${SC[t.status]||C.dim}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div>
              <div style={{color:C.heading,fontSize:13}}>{t.job_title}</div>
              <div style={{color:C.dim,fontSize:10}}>{t.company} · {t.recipient_email}</div>
            </div>
            <span style={{fontSize:8,letterSpacing:1,padding:"3px 7px",borderRadius:2,
              border:`1px solid ${SC[t.status]||C.dim}`,color:SC[t.status]||C.dim}}>
              {t.status?.toUpperCase()}
            </span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px 14px",fontSize:9,color:C.dim}}>
            <span>Sent: {new Date(t.sent_at).toLocaleString()}</span>
            <span>Follow-up: {t.follow_up_sent?"Sent":"Pending"}</span>
            <span>Reply: {t.reply_received?"Received ✓":"Awaiting"}</span>
          </div>
          {t.reply_summary&&(
            <div style={{marginTop:8,padding:"7px 10px",background:C.greenBg,
              border:`1px solid ${C.greenDim}`,borderRadius:2,fontSize:11,color:C.text,lineHeight:1.7}}>
              <span style={{color:C.green,fontSize:8,letterSpacing:1}}>REPLY SUMMARY  </span>
              {t.reply_summary}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [jd,               setJd]               = useState("");
  const [scrapedCompany,   setScrapedCompany]    = useState("");
  const [manualCompany,    setManualCompany]    = useState("");  // user-typed company name
  const [profile,          setProfile]          = useState({countryCode:"+91"});
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [ragKB,            setRagKB]            = useState([]);
  const [ragSummary,       setRagSummary]       = useState("");
  const [ragCtx,           setRagCtx]           = useState("");
  const [companyResearch,  setCompanyResearch]  = useState(null);
  const [scraping,         setScraping]         = useState(false);
  const [emailStyle,       setEmailStyle]       = useState("none");
  const [demoMode,         setDemoMode]         = useState(false);
  const [demoEmailOverride,setDemoEmailOverride] = useState("");
  const [logs,             setLogs]             = useState([]);
  const [stageStatus,      setStageStatus]      = useState({1:"idle",2:"idle",3:"idle",4:"idle"});
  const [docData,          setDocData]          = useState(null);
  const [atsData,          setAtsData]          = useState(null);
  const [atsLoading,       setAtsLoading]       = useState(false);
  const [interviewReady,   setInterviewReady]   = useState(false);
  const [running,          setRunning]          = useState(false);
  const [tab,              setTab]              = useState("resume");
  const [emailText,        setEmailText]        = useState("");
  const [emailSubject,     setEmailSubject]     = useState("");
  const [coverText,        setCoverText]        = useState("");
  const [coverSubject,     setCoverSubject]     = useState("");
  const logEndRef = useRef(null);
  const t0        = useRef(0);

  useEffect(()=>{
    const s = document.documentElement.style;
    s.margin="0"; s.padding="0"; s.height="100%"; s.overflow="hidden";
    const b = document.body.style;
    b.margin="0"; b.padding="0"; b.height="100%"; b.overflow="hidden";
    const r = document.getElementById("root");
    if(r){ r.style.height="100%"; r.style.overflow="hidden"; }
  },[]);

  useEffect(()=>{ logEndRef.current?.scrollIntoView({behavior:"smooth"}); },[logs]);

  const addLog = (msg, type="info") => {
    const ts = new Date().toISOString().split("T")[1].slice(0,11);
    setLogs(p=>[...p,{msg,type,ts}]);
  };
  const sleep    = ms => new Promise(r=>setTimeout(r,ms));
  const setStage = (n,s) => setStageStatus(p=>({...p,[n]:s}));

  const handleScrape = async (username) => {
    if (!username?.trim()) return;
    setScraping(true);
    const jdHint = jd.trim() ? ` (JD-aware)` : "";
    addLog(`Scraping GitHub: ${username}${jdHint}...`,"info");
    if (!jd.trim()) addLog("⚠  Paste a JD first for best repo selection","warn");
    try {
      const result = await api.post("/scrape-github",{
        username:  username.trim(),
        max_repos: 10,
        jd_text:   jd.trim(),   // ← JD-aware scoring
      });
      setRagKB(result.kb_entries||[]);
      setRagSummary(result.raw_summary||"");
      addLog(`GitHub: ${result.repos_found} repos → ${result.kb_entries?.length||0} KB entries`,"success");
      if (result.raw_summary) addLog(result.raw_summary,"info");
      setProfileCollapsed(true);
    } catch(e) { addLog(`GitHub scrape failed: ${e.message}`,"error"); }
    setScraping(false);
  };

  const loadDemo = () => {
    setProfile(DEMO_PROFILE);
    setJd(DEMO_JD);
    setScrapedCompany(""); setManualCompany(""); // let the pipeline extract company from JD
    setDemoMode(true);
    setProfileCollapsed(false);
    setLogs([]);
    addLog("▶ DEMO loaded — profile + JD prefilled","success");
    addLog("① Optionally SCRAPE GitHub to build live KB","info");
    addLog("② Click RUN PIPELINE to generate documents","info");
    addLog("③ On EMAIL tab — enter YOUR Gmail to receive demo email","info");
  };

  const runATS = async (doc, allSkills, missingSkills) => {
    if (!jd||!doc) return;
    setAtsLoading(true); setAtsData(null);
    addLog("ATS: running fast keyword scorer...","info");
    const bullets = (doc.experience||[]).flatMap(e=>e.bullets||[]);
    const atsPayload = {
      jd_text:        jd,
      resume_bullets: bullets,
      resume_summary: doc.summary||"",
      matched_skills: doc.matched_skills||[],
      missing_skills: doc.missing_skills||[],
    };

    let fastResult = null;
    try {
      fastResult = await api.post("/ats-fast", atsPayload);
      setAtsData({...fastResult, _phase:"fast"});
      addLog(`ATS fast score: ${fastResult.score}/100 (${fastResult.grade}) — refining with LLM...`,"info");
    } catch(e) {
      addLog("ATS fast scorer unavailable — using LLM only","warn");
    }

    try {
      const result = await api.post("/ats-check",{
        jd_text:        jd,
        resume_bullets: bullets,
        matched_skills: doc.matched_skills||[],
        missing_skills: doc.missing_skills||[],
      });
      const blendedResult = fastResult ? {
        ...result,
        score:          fastResult.score,      // trust math over LLM guess
        grade:          fastResult.grade,
        keyword_hits:   fastResult.keyword_hits,
        keyword_misses: fastResult.keyword_misses,
        section_checks: fastResult.section_checks,
        _phase:         "blended",
      } : result;
      const adjustedResult = blendedResult;
      const result_alias = adjustedResult;

      let penalty = 0;
      const penaltyNotes = [];
      if (!doc.summary || doc.summary.trim().length < 20) {
        penalty += 12; penaltyNotes.push("Missing professional summary (-12)");
      }
      const hasPlaceholderCompany = (doc.experience||[]).some(e =>
        !e.company || e.company.toLowerCase().includes("personal project") ||
        e.company.toLowerCase().includes("the company") || e.company.trim().length < 3
      );
      if (hasPlaceholderCompany) { penalty += 8; penaltyNotes.push("Generic employer name (-8)"); }
      if (bullets.length < 4) { penalty += 10; penaltyNotes.push("Thin work history (-10)"); }
      const weakCount = bullets.filter(b => b.trim().split(/\s+/).length < 5).length;
      if (weakCount > 0) { penalty += weakCount * 3; penaltyNotes.push(`${weakCount} very short bullet(s) (<5 words) (-${weakCount*3})`); }

      const baseScore = fastResult ? fastResult.score : int(result_alias.score);
      const adjustedScore = Math.max(0, baseScore - penalty);
      const adjustedGrade = adjustedScore>=80?"A":adjustedScore>=65?"B":adjustedScore>=50?"C":adjustedScore>=35?"D":"F";

      const finalResult = {
        ...result_alias,
        score:    adjustedScore,
        grade:    adjustedGrade,
        summary:  penalty > 0
          ? `${result_alias.summary} Structural penalties: ${penaltyNotes.join("; ")}.`
          : result_alias.summary,
        suggestions: [
          ...(penaltyNotes.length>0?[`Fix structural issues: ${penaltyNotes.join(" | ")}`]:[]),
          ...(result_alias.suggestions||[]),
        ],
      };
      setAtsData(finalResult);
      const scoreColor = finalResult.score>=75?"success":finalResult.score>=55?"warn":"error";
      addLog(`ATS final: ${finalResult.score}/100 (${finalResult.grade}) — ${finalResult.keyword_hits?.length||0} kw matched`,scoreColor);
    } catch(e) {
      if (fastResult) {
        addLog(`ATS LLM refinement failed — using fast score (${fastResult.score}/100)`,"warn");
        setAtsData({...fastResult, _phase:"fast-only"});
      } else {
        addLog(`ATS check failed: ${e.message}`,"warn");
      }
    }
    setAtsLoading(false);
  };

  const runPipeline = async () => {
    if (!jd.trim()||running) return;

    setRunning(true); setLogs([]); setDocData(null); setAtsData(null); setCompanyResearch(null);
    setRagKB([]);        // clear stale KB — scrape always runs fresh inside pipeline
    setRagSummary("");
    let latestKB = [];   // holds freshly scraped KB — avoids React state sync issue
    setInterviewReady(false); setStageStatus({1:"idle",2:"idle",3:"idle",4:"idle"});
    setEmailText(""); setEmailSubject(""); setCoverText(""); setCoverSubject("");
    t0.current = Date.now();

    if (profile.github?.trim()) {
      addLog(`── GitHub: scraping ${profile.github} (JD-aware)...`,"info");
      setScraping(true);
      try {
        const scrapeResult = await api.post("/scrape-github", {
          username:  profile.github.trim(),
          max_repos: 10,
          jd_text:   jd.trim(),
        });
        const newKB = scrapeResult.kb_entries || [];
        setRagKB(newKB);
        setRagSummary(scrapeResult.raw_summary || "");
        latestKB = newKB;   // capture locally — React state won't update synchronously
        if (newKB.length === 0) {
          addLog(`── GitHub: repos found but 0 KB entries extracted — Groq may have failed`,"warn");
          addLog(`── Try again or add manual experience bullets`,"warn");
        } else {
          addLog(`── GitHub: ${scrapeResult.repos_found} repos → ${newKB.length} KB entries (JD-matched)`,"success");
        }
      } catch(e) {
        const isNetwork = e.message.includes("NetworkError") || e.message.includes("fetch") || e.message.includes("Failed");
        if (isNetwork) {
          addLog(`── GitHub scrape failed: backend can't reach GitHub API`,"error");
          addLog(`── Check: is your backend running? Can it reach api.github.com?`,"warn");
        } else {
          addLog(`── GitHub scrape failed: ${e.message}`,"error");
        }
      }
      setScraping(false);
    } else if (ragKB.length === 0 && !profile.manualKB?.trim()) {
      addLog("⚠  No GitHub username and no manual KB","warn");
    }

    const hasKB = latestKB.length > 0 || profile.manualKB?.trim();
    if (!hasKB) {
      addLog("","space");
      addLog("✖ No KB data — cannot generate resume","error");
      addLog("  GitHub scrape failed or returned 0 entries.","warn");
      addLog("  Fix: paste your project bullets in MANUAL EXPERIENCE field","warn");
      addLog("  or check that your backend can reach api.github.com","warn");
      setRunning(false); setScraping(false);
      setStage(1,"done");
      return;
    }

    setStage(1,"running");
    addLog("══ STAGE 1: INGESTION & RAG RETRIEVAL ══","header");
    await sleep(300);

    let effectiveKB = [...latestKB];
    if (profile.manualKB?.trim()) {
      const lines = profile.manualKB.trim().split("\n").filter(l=>l.trim().length>5);
      const manualEntry = {
        id:"manual_experience", label:"Manual Experience",
        skills: extractSkills(profile.manualKB+" "+jd, []),
        facts: lines,
      };
      effectiveKB = [manualEntry, ...latestKB];
      addLog(`Manual KB: ${lines.length} experience lines injected`,"success");
    }

    const skills     = extractSkills(jd, effectiveKB);
    addLog(`Extracted ${skills.length} skill signals: [${skills.slice(0,5).join(", ")}${skills.length>5?"...":""}]`,"success");
    await sleep(400);

    let ragResults = [];
    if (effectiveKB.length > 0) {
      try {
        const semResp = await api.post("/agent/semantic-match", {
          jd_text:    jd,
          kb_entries: effectiveKB,
          top_k:      effectiveKB.length,   // score all, we filter locally
        });
        ragResults = (semResp.ranked_entries || []).filter(e => (e.relevance_score||0) > 0);
      } catch(_) {
      }
    }
    if (ragResults.length === 0) ragResults = queryRAG(skills, effectiveKB);

    const totalFacts = ragResults.reduce((a,b)=>a+b.facts.length,0);
    addLog(`Retrieved ${ragResults.length} KB entries / ${totalFacts} facts`,"success");
    const SKILL_GROUPS = {
      "llm":                ["llm","gpt","gpt2","gpt-2","nanogpt","language model","large language"],
      "machine learning":   ["machine learning","pytorch","tensorflow","sklearn","neural","ml ","deep learning"],
      "deep learning":      ["deep learning","pytorch","tensorflow","neural network","transformer"],
      "nlp":                ["nlp","natural language","bert","gpt","transformer","language model"],
      "cv":                 ["cv","computer vision","object detection","image","cnn","yolo"],
      "rl":                 ["rl","reinforcement","q-learning","policy","reward","agent"],
      "autograd":           ["autograd","backpropagation","automatic differentiation","micrograd","gradient"],
      "transformer":        ["transformer","attention","self-attention","gpt","bert","encoder","decoder"],
      "bpe":                ["bpe","byte pair","tokenisation","tokenizer","minbpe"],
      "operations":         [],   // never a real skill — skip
      "responsibilities":   [],   // JD structural word — skip
      "design":             [],   // too generic
    };

    const kbFullText = ragResults
      .flatMap(e => [...(e.skills||[]), ...(e.facts||[])])
      .join(" ").toLowerCase();
    const kbSkillsAll = ragResults.flatMap(e => (e.skills||[]).map(s => s.toLowerCase()));

    const missing = skills.filter(s => {
      const sl = s.toLowerCase();

      if (SKILL_GROUPS[sl] !== undefined && SKILL_GROUPS[sl].length === 0) return false;
      if (sl.length <= 2) return false;

      const groupTerms = SKILL_GROUPS[sl] || [sl];
      const coveredByGroup = groupTerms.some(term =>
        kbFullText.includes(term) || kbSkillsAll.some(ks => ks.includes(term))
      );
      if (coveredByGroup) return false;

      const inSkills = kbSkillsAll.some(ks => ks.includes(sl) || sl.includes(ks));
      const inFacts = kbFullText.includes(sl) ||
        (sl.includes(" ") && sl.split(" ").filter(w=>w.length>3).every(w => kbFullText.includes(w)));

      return !inSkills && !inFacts;
    });

    if (missing.length) addLog(`⚠  KB gap — JD wants: [${missing.slice(0,6).join(", ")}${missing.length>6?"...":""}]`,"warn");
    else addLog("✓ KB covers all JD skill signals","success");
    setStage(1,"done"); await sleep(200);

    const titleM   = jd.match(/(?:position|role|title)[:\s]+([^\n]+)/i)||jd.match(/^([^\n]{10,60})/);
    const jobTitle = titleM ? titleM[1].trim().slice(0,60) : "Technical Role";
    const companyM = jd.match(/(?:at|join|company[:\s]+|employer[:\s]+)\s+([A-Z][A-Za-z0-9 &.]+?)(?:\.|,|\n|$)/);
    const jdExtracted = companyM ? companyM[1].trim() : "";
    const hiringCompanyLocal = manualCompany.trim() || scrapedCompany || jdExtracted;
    const hiringCompany = hiringCompanyLocal;
    if (!hiringCompany) addLog("⚠  No company name found — add it above the JD for better emails","warn");

    const companyForResearch = hiringCompany;
    let researchCtx = "";
    let researchSignals = [];
    if (companyForResearch && companyForResearch.length > 2) {
      addLog("","space");
      addLog(`── Company research agent: searching "${companyForResearch}"...`,"info");
      try {
        const timeout = new Promise((_,rej) => setTimeout(()=>rej(new Error("timeout")), 12000));
        const research = await Promise.race([
          api.post("/agent/research-company", {
            company:   companyForResearch,
            jd_text:   jd,
            job_title: jobTitle,
          }),
          timeout,
        ]);
        setCompanyResearch(research);
        researchCtx     = research.context || "";
        researchSignals = research.signals || [];
        if (researchCtx) {
          addLog(`── Research: ${researchCtx.slice(0,80)}...`,"success");
          if (researchSignals.length)
            addLog(`── Signals: ${researchSignals.slice(0,2).join(" · ")}`, "info");
        } else {
          addLog("── Research returned no usable context","warn");
        }
      } catch(e) {
        addLog(`── Company research skipped (${e.message}) — continuing`,"warn");
      }
    }

    setStage(2,"running");
    addLog("","space");
    addLog("══ STAGE 2: DOCUMENT GENERATION ══","header");
    const ctx = ragResults.length>0
      ? ragResults.map(r=>`[${r.label}]\n${r.facts.map(f=>`  • ${f}`).join("\n")}`).join("\n\n")
      : `[Summary]\n  • ${ragSummary||"No GitHub data — resume will be generic"}`;
    setRagCtx(ctx);
    if (ragResults.length === 0) {
      addLog("⚠  No KB facts to ground resume — bullets may be generic","warn");
    }

    const selectedStyle = EMAIL_STYLES.find(s=>s.id===emailStyle);
    const fewShotBlock  = selectedStyle?.sample
      ? `\nFEW-SHOT EMAIL EXAMPLE (match this tone and style exactly):\n---\n${selectedStyle.sample}\n---\n`
      : "";

    const docSys = `You are a technical resume writer. Output ONLY valid JSON — no markdown, no preamble.

CANDIDATE: ${profile.name||"Candidate"} | ${profile.degree||""} | ${profile.college||""}
${hiringCompany ? `HIRING COMPANY: ${hiringCompany}` : "HIRING COMPANY: unknown — do NOT invent a company name, refer to 'this role' or 'your team' instead."}
${researchCtx ? `
COMPANY RESEARCH (real facts found by web agent — use at least ONE of these in Para 1):
${researchCtx}
Specific signals: ${researchSignals.slice(0,3).join(" | ")}
IMPORTANT: Reference one of these facts naturally in Para 1. Do NOT copy them verbatim — weave them into your own sentence.` : ""}

FORBIDDEN words/phrases — banned entirely, instant rejection:
delve, spearheaded, testament, tapestry, transformative, synergy, seamless, cutting-edge, landscape,
"leveraging its strengths", "leveraging the power", "demonstrating expertise in", "focusing on efficiency",
"flexibility and ease of use", "rapid prototyping and dynamic", "significant impact on the",
"coherent and contextually relevant", "notable level of engagement",
"I am excited", "valuable asset", "look forward to hearing", "passionate about", "I am writing to apply",
"I believe my experience aligns", "would be a great fit", "I am confident that".

STAR COUNT RULE: NEVER write a bullet about stars, GitHub popularity, or community impact.
"Achieved X stars" is NOT a resume bullet — it adds zero technical signal. Skip it.

SUMMARY RULES:
- 1-sentence, 15-20 words. Lead with strongest concrete skill + domain.
- GOOD: "ML engineer with PyTorch GPT re-implementation and RL agent projects in JavaScript."
- BAD: "Passionate developer eager to learn." / "AI enthusiast with diverse experience."

BULLET RULES — each bullet must pass ALL three checks:
  CHECK 1 — SOURCE: Can you point to the exact KB fact this came from? If no → delete it.
  CHECK 2 — SPECIFICITY: Does it name a specific technology, architecture, algorithm, or metric? If no → delete it.  
  CHECK 3 — NO FILLER: Does it contain any forbidden phrase or generic padding? If yes → rewrite or delete.

- Structure: [STRONG VERB] + [SPECIFIC TECH] + [REAL CONSTRAINT/DECISION/OUTCOME]
- GOOD: "Re-implemented GPT-2 training loop in PyTorch; character-level tokenisation chosen over BPE for simplicity"
- GOOD: "Built RL agent library in JavaScript with Q-learning, temporal difference, and dynamic programming variants"
- BAD: "Utilized PyTorch as the primary deep learning framework, leveraging its strengths in rapid prototyping"
- BAD: "Achieved a high level of popularity demonstrating the project's significance"
- BAD: "Focused on creating a model that can generate coherent and contextually relevant text"

- 2-4 bullets per project (quality > quantity)
- KEYWORD INJECTION: Every bullet MUST contain at least one exact word from that entry's skills[]. If skills include "transformer","attention","autograd","bpe","cuda" — use those exact words in the bullet. ATS systems scan for these literals.
- ARCHITECTURE NAMES: Use the precise term. GPT projects → write "transformer" and "attention". Autograd engines → write "autograd" or "backpropagation". BPE projects → write "BPE" and "tokenisation". These exact words are what recruiters and ATS look for.
- If KB fact is thin: write ONE bullet with the exact tech from skills[] + what was built. Nothing more.
- ZERO HALLUCINATION: every claim must trace to KB facts or skills[]. No invented metrics or outcomes.
- If KB is empty: experience = [{"company":"No project data","role":"—","bullets":["Add GitHub username or manual experience to generate real content."]}]
- experience[].company = repo/project name from KB only
- experience[].role = specific title (ML Engineer, NLP Engineer, RL Developer) inferred from project tech
${fewShotBlock}
EMAIL: STRICT MINIMUM 300 words. EXACTLY 4 paragraphs separated by a blank line.
Para 1 (~60w): Role + specific reason for THIS company from JD.
Para 2 (~100w): Most relevant project — name architecture/dataset/constraint specifically.
Para 3 (~100w): Second project/skill tied to a named JD requirement.
Para 4 (~60w): Confident next-step ask. Do NOT start with "I am writing to apply".

Return exactly:
{"job_title":"string","summary":"professional summary 15-20 words","subject":"specific email subject","experience":[{"company":"repo/project name","role":"specific role title","bullets":["10+ word bullet"]}],"matched_skills":["skill"],"missing_skills":["skill"],"email":"full 4-paragraph email text"}`;

    addLog(`Generating resume + email (${emailStyle!=="none"?emailStyle+" style":"auto tone"})...`,"info");
    await sleep(300);

    let doc = null;
    try {
      const raw   = await callGroq(docSys,`JOB DESCRIPTION:\n${jd}\n\nCANDIDATE KB:\n${ctx}\n\nTarget role: ${jobTitle}`,MODELS.doc,true);
      doc = JSON.parse(raw.replace(/```json|```/g,"").trim());
      if (hiringCompany) doc.company = hiringCompany;
      addLog(`${doc.experience?.reduce((a,b)=>a+(b.bullets?.length||0),0)||0} bullets | ${doc.email?.trim().split(/\s+/).length||0} word email`,"success");
    } catch(err) {
      addLog(`Parse error — RAG fallback`,"warn");
      doc = {
        job_title:jobTitle, company:hiringCompany||"",
        summary: ragSummary||"Software engineer with ML and infrastructure experience.",
        experience: ragResults.slice(0,3).map(r=>({company:r.label,role:"Engineer",bullets:r.facts.slice(0,3)})),
        matched_skills:skills, missing_skills:missing,
        email:`Hi,\n\nApplying for ${jobTitle}. ${ragSummary}\n\nBest,\n${profile.name||"Candidate"}`,
      };
    }
    setDocData(doc);
    setEmailText(scrubEmail(doc.email||"")); setEmailSubject(doc.subject||"");
    setStage(2,"done"); await sleep(200);

    setStage(3,"running");
    addLog("","space");
    addLog("══ STAGE 3: TELEMETRY + ATS CHECK ══","header");
    await sleep(300);
    const elapsed = Date.now()-t0.current;
    const telem   = {
      job_title:       doc.job_title||jobTitle,
      company:         hiringCompany||"",
      skills_required: skills.length,
      skills_matched:  doc.matched_skills?.length??0,
      skills_missing:  doc.missing_skills?.length??0,
      rag_entries:     ragResults.length,
      facts_retrieved: totalFacts,
      doc_model:       MODELS.doc,
      interview_model: MODELS.interview,
      processing_ms:   elapsed,
      timestamp:       new Date().toISOString(),
      kb_entries_used: ragResults.map(e=>e.id),
      resume_bullets:  (doc.experience||[]).flatMap(e=>e.bullets||[]).slice(0,20),
      matched_skills:  doc.matched_skills||[],
      missing_skills:  doc.missing_skills||[],
    };
    fetch(`${PROXY}/telemetry`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(telem)}).catch(()=>{});
    addLog(`Coverage: ${telem.skills_matched}/${telem.skills_required} | ${elapsed}ms`,"info");
    runATS(doc, skills, missing);
    setStage(3,"done"); await sleep(200);

    setStage(4,"running");
    addLog("","space");
    addLog("══ STAGE 4: INTERVIEW + AUDIO HANDOFF ══","header");
    await sleep(300);
    addLog("Project context → interviewer prompt","success");
    addLog("Sarvam AI STT/TTS: standby — select language on Interview tab","info");
    addLog("","space");
    addLog("▶▶ PIPELINE COMPLETE","success");
    setInterviewReady(true); setTab("resume"); setStage(4,"done");
    setRunning(false);
  };

  const TABS = [
    {id:"resume",    label: atsData ? `RESUME  ATS:${atsData.score}` : "RESUME"},
    {id:"email",     label:"EMAIL"},
    {id:"cover",     label:"COVER LETTER"},
    {id:"threads",   label:"THREADS"},
    {id:"interview", label:interviewReady?"● AUDIO INTERVIEW":"AUDIO INTERVIEW"},
  ];

  return (
    <div style={{background:C.bg,position:"fixed",top:0,left:0,right:0,bottom:0,color:C.text,
      fontFamily:"'Courier New','Consolas','Monaco',monospace",
      display:"flex",flexDirection:"column",overflow:"hidden"}}>

      
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,
        padding:"8px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{color:C.green,fontSize:14,fontWeight:700,letterSpacing:3}}>▶ JOB_AGENT</div>
        <div style={{color:C.dim,fontSize:9,letterSpacing:1}}>autonomous application pipeline</div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:16}}>
          {[1,2,3,4].map(n=><StagePip key={n} n={n} status={stageStatus[n]}/>)}
          <div style={{width:1,height:12,background:C.border}}/>
          <div style={{fontSize:9,letterSpacing:1,
            color:running?C.amber:interviewReady?C.green:C.dim}}>
            {running?"● RUNNING":interviewReady?"● READY":"○ IDLE"}
          </div>
        </div>
      </div>

      
      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 40px)"}}>

        
        <div style={{width:"38%",minWidth:280,borderRight:`1px solid ${C.border}`,
          display:"flex",flexDirection:"column",overflow:"hidden"}}>

          
          <div style={{padding:"7px 14px",borderBottom:`1px solid ${C.border}`,
            flexShrink:0,display:"flex",alignItems:"center",gap:8,background:"#fafaf6"}}>
            <div style={{flex:1}}>
              <span style={{color:"#909088",fontSize:8,letterSpacing:2}}>DEMO MODE</span>
              {demoMode && <span style={{color:C.green,fontSize:8,marginLeft:8,letterSpacing:1}}>● ACTIVE</span>}
            </div>
            <button onClick={loadDemo} style={{
              padding:"3px 12px",fontSize:9,letterSpacing:1,fontFamily:"inherit",
              background:demoMode?C.amberBg:"transparent",
              border:`1px solid ${demoMode?C.amber:"#d0d0c8"}`,
              borderRadius:2,color:demoMode?C.amber:"#909088",cursor:"pointer",
              transition:"all 0.15s",whiteSpace:"nowrap",
            }}>⚡ {demoMode?"DEMO LOADED":"LOAD DEMO"}</button>
            {demoMode&&(
              <button onClick={()=>{setDemoMode(false);setProfile({countryCode:"+91"});setJd("");setScrapedCompany("");setManualCompany("");}} style={{
                padding:"3px 7px",fontSize:10,fontFamily:"inherit",background:"transparent",
                border:`1px solid ${C.border}`,borderRadius:2,color:C.dim,cursor:"pointer",
              }}>✕</button>
            )}
          </div>

          <ProfilePanel profile={profile} setProfile={setProfile}
            ragKB={ragKB} onScrape={handleScrape} scraping={scraping}
            collapsed={profileCollapsed} setCollapsed={setProfileCollapsed}/>

          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{color:C.dim,fontSize:8,letterSpacing:2,marginBottom:5}}>JOB DESCRIPTION</div>
            
            <input
              value={manualCompany}
              onChange={e=>setManualCompany(e.target.value)}
              placeholder="Company name (optional — if not in JD)"
              style={{width:"100%",marginBottom:6,padding:"5px 8px",
                background:"#f0f0ea",border:"1px solid #d0d0c8",borderRadius:3,
                color:C.text,fontSize:10,fontFamily:"inherit",outline:"none",
                boxSizing:"border-box"}}
            />
            <textarea value={jd} onChange={e=>setJd(e.target.value)}
              placeholder="Paste the job description here..."
              style={{width:"100%",height:80,background:"#f0f0ea",border:"1px solid #d0d0c8",
                borderRadius:3,color:C.text,padding:"8px 10px",fontSize:11,fontFamily:"inherit",
                resize:"none",outline:"none",lineHeight:1.65,boxSizing:"border-box"}}/>
            <button onClick={runPipeline} disabled={running||!jd.trim()} style={{
              marginTop:7,width:"100%",padding:"9px",
              background:running?C.greenBg:jd.trim()?C.greenBg:"transparent",
              border:`2px solid ${running?C.green:jd.trim()?C.green:"#d0d0c8"}`,
              borderRadius:3,color:running?C.green:jd.trim()?C.green:"#909088",
              fontSize:10,fontFamily:"inherit",fontWeight:jd.trim()?"600":"400",
              cursor:running||!jd.trim()?"not-allowed":"pointer",
              letterSpacing:2,transition:"all 0.2s",
              boxShadow:jd.trim()&&!running?`0 0 14px ${C.green}28`:"none",
            }}>{running?"▶ RUNNING...":"▶ RUN PIPELINE"}</button>
          </div>

          
          <div style={{flex:1,minHeight:120,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"4px 14px",borderBottom:`1px solid ${C.border}`,
              color:C.dim,fontSize:8,letterSpacing:2,flexShrink:0}}>TERMINAL</div>
            <div style={{flex:1,overflowY:"auto",padding:"8px 14px"}}>
              {logs.length===0&&(
                <div style={{color:C.dim,fontSize:10.5,lineHeight:2.2}}>
                  {'> 1. Fill profile + GitHub username → SCRAPE'}<br/>
                  {'> 2. Paste job description below'}<br/>
                  {'> 3. Click RUN PIPELINE'}<br/>
                  <span style={{animation:"blink 1.2s infinite"}}>{'> █'}</span>
                </div>
              )}
              {logs.map((l,i)=><LogLine key={i} {...l}/>)}
              <div ref={logEndRef}/>
            </div>
          </div>
        </div>

        
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                padding:"8px 16px",background:tab===t.id?C.greenBg:"transparent",
                border:"none",borderBottom:tab===t.id?`2px solid ${C.green}`:"2px solid transparent",
                color:tab===t.id?C.green:C.dim,fontSize:9,fontFamily:"inherit",
                cursor:"pointer",letterSpacing:1.5,transition:"color 0.2s",whiteSpace:"nowrap",
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:18}}>
            
            <div style={{display:tab==="resume"?"block":"none"}}><ResumeView data={docData} atsData={atsData} atsLoading={atsLoading} profile={profile} ragSummary={ragSummary} addLog={addLog}/></div>
            <div style={{display:tab==="email"?"block":"none"}}><EmailView data={docData} profile={profile} docData={docData} jd={jd} ragCtx={ragCtx} emailStyle={emailStyle} setEmailStyle={setEmailStyle} emailText={emailText} setEmailText={setEmailText} emailSubject={emailSubject} setEmailSubject={setEmailSubject} demoMode={demoMode} demoEmailOverride={demoEmailOverride} setDemoEmailOverride={setDemoEmailOverride} companyResearch={companyResearch}/></div>
            <div style={{display:tab==="cover"?"block":"none"}}><CoverLetterView docData={docData} ragCtx={ragCtx} jd={jd} profile={profile} ragSummary={ragSummary} coverText={coverText} setCoverText={setCoverText} coverSubject={coverSubject} setCoverSubject={setCoverSubject}/></div>
            <div style={{display:tab==="threads"?"block":"none"}}><ThreadsView/></div>
            <div style={{display:tab==="interview"?"block":"none"}}><AudioInterviewView ready={interviewReady} docData={docData} jd={jd} profile={profile}/></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        textarea::placeholder { color:#a0a098; }
        input::placeholder { color:#a0a098; }
        select option { background:#ffffff; color:#1a1a18; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#c0c0b8; border-radius:2px; }
      `}</style>
    </div>
  );
}
