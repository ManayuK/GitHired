
export const EMAIL_SAMPLES = [
  {
    id: "fresher_cs",
    label: "Fresher — CS grad, first application",
    profile: "Final-year student, no work experience, has personal projects",
    sample: `Subject: Application for Data Science Internship — [Your Name], IIIT Delhi

Dear [Recruiter Name],

I came across the Data Science Internship listing on LinkedIn and wanted to apply. I am a final-year Computer Science student at IIIT Delhi, graduating in May 2025.

Most of what I know comes from building things outside class. My most complete project is a traffic signal controller I built using reinforcement learning — the agent runs in CityFlow simulator and outperforms fixed-timing baselines on standard flow files. The reward function took several iterations to get right; penalising queue length alone caused oscillation, so I added a delay-delta term to stabilise it. The code is on my GitHub if it is useful context.

I would be glad to discuss this or any other work in more detail. A brief call at your convenience would be welcome.

Regards,
[Your Name]
[Phone] | [Email] | github.com/[username]`
  },
  {
    id: "fresher_non_cs",
    label: "Fresher — non-CS, career transition",
    profile: "Mechanical/ECE background, transitioning into software/data roles",
    sample: `Subject: Application for ML Engineer Role — [Your Name]

Dear Hiring Team,

I am applying for the ML Engineer position listed on your careers page. My background is in Electronics Engineering, but the last two years of my degree have been focused entirely on machine learning systems — first through coursework, then through independent projects.

The work I am most confident about is an image super-resolution pipeline I built for a satellite imagery dataset. The main challenge was data quality — over half the image pairs had alignment errors of more than three pixels, which I found by visualising the training loss diverging early. I pivoted to a synthetic degradation approach, generating low-resolution inputs from clean high-res sources, which gave stable training and measurable PSNR improvement. It is not a polished product, but the problem-solving process is something I can speak to in detail.

I would appreciate the opportunity to discuss the role. I am available for a call any time this week.

Sincerely,
[Your Name]
[Email] | [Phone]`
  },
  {
    id: "experienced_ml",
    label: "Experienced — 2+ years, ML/backend",
    profile: "Working professional, established technical credibility",
    sample: `Subject: ML Engineer Application — [Your Name] | Ex-[Current Company]

[Recruiter Name],

Applying for the Senior ML Engineer role. I currently work at [Company] on production recommendation systems; before that I spent two years on NLP pipelines at [Previous Company].

The work most relevant to your JD is a real-time feature store I built on top of Redis and Kafka. The original system had a 200ms P99 latency that was making online inference unusable; the root cause was synchronous feature hydration on the critical path. Moving feature pre-computation offline and serving from Redis cut P99 to 18ms. The harder part was keeping the offline and online feature definitions in sync — we ended up generating both from a single YAML schema, which eliminated an entire class of training-serving skew bugs.

I have attached my resume. Happy to do a technical screen at whatever depth is useful.

[Your Name]
[Email] | [LinkedIn]`
  },
  {
    id: "research_academic",
    label: "Research / academic — applying to R&D role",
    profile: "Has published or submitted a paper, applying to research-oriented team",
    sample: `Subject: Research Engineer Application — [Your Name]

Dear [Team/Name],

I am writing about the Research Engineer opening on your NLP team. My background is in applied ML research; I recently co-authored a paper on adaptive traffic signal control using multi-agent reinforcement learning, accepted at [Venue] this year.

The core contribution was a vehicle-to-infrastructure communication layer that lets agents share partial observations without a centralised controller. The implementation constraint that drove the design was deployment on embedded hardware with limited bandwidth — we had to keep the message payload under 64 bytes per timestep while still conveying enough state for cooperative behaviour. The paper has the full ablation results; the short version is that V2I reduced re-exploration rate by about 30% on dense-traffic maps.

I am looking for a team where rigorous experimentation and publication are part of the normal workflow. Would a short call to discuss the team's current research directions be possible?

[Your Name]
[Email] | [Google Scholar / arXiv link]`
  },
  {
    id: "startup_direct",
    label: "Startup / direct — short and punchy",
    profile: "Applying to a small team, founder-led, informal culture",
    sample: `Subject: Fullstack ML — [Your Name]

Hi [Name],

Saw the posting for a fullstack ML engineer. Here is the relevant bit: I built and shipped an offline-first Flutter app that runs a 4-bit quantised Llama model on-device — no cloud, no API calls, works on a mid-range Android. The main constraint was RAM: getting 2.1GB headroom on a phone with 4GB total required careful memory mapping and lazy model loading. The app is on GitHub and installable if you want to test it.

On the backend side I have done Lambda + API Gateway + Terraform stacks and some FastAPI work. Nothing exotic.

Would a 20-minute call work this week?

[Your Name]
github.com/[username]`
  },
];

// SARVAM LANGUAGE OPTIONS 
export const SARVAM_LANGUAGES = [
  { code: "hi-IN", label: "Hindi" },
  { code: "en-IN", label: "English (Indian)" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "bn-IN", label: "Bengali" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "mr-IN", label: "Marathi" },
  { code: "od-IN", label: "Odia" },
  { code: "pa-IN", label: "Punjabi" },
];

export const SARVAM_SPEAKERS = {
  female: ["meera", "pavithra", "maitreyi"],
  male:   ["arvind", "amol", "amartya"],
};
