import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Github, Twitter, Linkedin, Shield, Terminal, ExternalLink } from "lucide-react";

const blogPages = import.meta.glob("./blogs/*.md", { as: "raw" });

type BlogPostEntry = {
  slug: string;
  title: string;
  loader: () => Promise<string>;
};

type RouteState =
  | { type: "home" }
  | { type: "blogs" }
  | { type: "blog"; slug: string };

function slugToTitle(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function parseHashRoute(hash: string): RouteState {
  const cleaned = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (!cleaned) return { type: "home" };
  if (cleaned === "blogs") return { type: "blogs" };
  const parts = cleaned.split("/");
  if (parts[0] === "blog" && parts[1]) {
    return { type: "blog", slug: parts[1] };
  }
  return { type: "home" };
}

function renderMarkdown(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const content = paragraphLines.join(" ").trim();
    nodes.push(
      <p key={nodes.length} className="text-white/80 leading-relaxed mb-6">
        {parseInlineMarkdown(content)}
      </p>,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={nodes.length} className="list-disc list-inside text-white/80 mb-6 space-y-2">
        {listItems.map((item, index) => (
          <li key={index}>{parseInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    nodes.push(
      <pre key={nodes.length} className="mb-6 overflow-auto rounded-lg border border-white/10 bg-[#070707] p-4 text-sm text-white/80">
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = [];
  };

  for (const line of lines) {
    if (codeLines.length > 0) {
      if (line.trim() === "```") {
        flushCode();
        continue;
      }
      codeLines.push(line);
      continue;
    }

    if (line.trim().startsWith("```") && codeLines.length === 0) {
      flushParagraph();
      flushList();
      codeLines = [];
      continue;
    }

    if (line.trim() === "```") {
      flushParagraph();
      flushList();
      codeLines = [];
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length, 6);
      const text = parseInlineMarkdown(headingMatch[2]);
      const key = nodes.length;
      if (level === 1) {
        nodes.push(
          <h1 key={key} className="text-white font-bold mb-6 leading-tight">
            {text}
          </h1>,
        );
      } else if (level === 2) {
        nodes.push(
          <h2 key={key} className="text-white font-bold mb-6 leading-tight">
            {text}
          </h2>,
        );
      } else if (level === 3) {
        nodes.push(
          <h3 key={key} className="text-white font-bold mb-6 leading-tight">
            {text}
          </h3>,
        );
      } else if (level === 4) {
        nodes.push(
          <h4 key={key} className="text-white font-bold mb-6 leading-tight">
            {text}
          </h4>,
        );
      } else if (level === 5) {
        nodes.push(
          <h5 key={key} className="text-white font-bold mb-6 leading-tight">
            {text}
          </h5>,
        );
      } else {
        nodes.push(
          <h6 key={key} className="text-white font-bold mb-6 leading-tight">
            {text}
          </h6>,
        );
      }
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  flushCode();

  return <div className="prose prose-invert max-w-none">{nodes}</div>;
}

function parseInlineMarkdown(text: string) {
  const parts: Array<string | ReactNode> = [];
  const regex = /\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [full, label, href] = match;
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={`${label}-${href}-${match.index}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-[#00FF00] underline"
      >
        {label}
      </a>,
    );
    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(parseHashRoute(window.location.hash));
  const blogPosts = useMemo<BlogPostEntry[]>(() => {
    return Object.entries(blogPages)
      .map(([path, loader]) => {
        const slug = path.split("/").pop()?.replace(/\.md$/, "") ?? "unknown";
        return {
          slug,
          title: slugToTitle(slug),
          loader: loader as () => Promise<string>,
        };
      })
      .sort((a, b) => a.slug.localeCompare(b.slug));
  }, []);

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#00FF00] selection:text-black font-sans relative">
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-20" />
      <div className="fixed inset-0 scanline pointer-events-none" />
      <Header />
      <main className="relative z-10">
        {route.type === "home" ? (
          <HomeContent blogPosts={blogPosts} />
        ) : route.type === "blogs" ? (
          <BlogListPage posts={blogPosts} />
        ) : (
          <BlogPostPage post={blogPosts.find((item) => item.slug === route.slug)} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function HomeContent({ blogPosts }: { blogPosts: BlogPostEntry[] }) {
  return (
    <>
      <Hero />
      <About />
      <ResumeSection />
      <BlogSection blogPosts={blogPosts} />
      <Projects />
      <Expertise />
      <Certifications />
      <Contact />
    </>
  );
}

function ResumeSection() {
  return (
    <section className="py-32 px-6 border-b border-[#1F1F1F] bg-[#0F0F0F]">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.4em] text-[#00FF00] mb-4 font-mono">/ Resume</h2>
          <h3 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">Download my CV.</h3>
          <p className="max-w-xl text-lg text-white/40 leading-relaxed mb-8">
            Get the latest version of my resume in PDF format. Perfect for recruiters, hiring managers, and collaborators looking to review my security experience.
          </p>
          <a
            href="./Abhishek_Shukla_Cybersecurity_Resume.pdf"
            download
            className="inline-flex items-center justify-center rounded-sm border border-[#00FF00] bg-[#00FF00]/10 px-8 py-3 text-[11px] font-bold uppercase tracking-widest text-[#00FF00] hover:bg-[#00FF00]/20 transition-colors"
          >
            Download CV
          </a>
        </div>
        <div className="p-8 border border-[#1F1F1F] bg-[#0A0A0A] rounded-lg">
          <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/20 mb-6">Latest Resume</div>
          <div className="grid gap-4 text-white/60 text-sm">
            <div>
              <span className="font-medium text-white">Title:</span> Security Engineer Resume
            </div>
            <div>
              <span className="font-medium text-white">Format:</span> PDF
            </div>
            <div>
              <span className="font-medium text-white">Ready for:</span> Applications, recruiters, and emergency reviews.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlogSection({ blogPosts }: { blogPosts: BlogPostEntry[] }) {
  return (
    <section id="blogs" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-[#00FF00] mb-4 font-mono">/ Blog</h2>
            <h3 className="text-4xl md:text-5xl font-bold tracking-tighter">Security writing and research.</h3>
          </div>
          <a
            href="#blogs"
            className="self-start rounded-sm border border-[#00FF00] px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-[#00FF00] hover:bg-[#00FF00]/10 transition-colors"
          >
            View all blogs
          </a>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {blogPosts.slice(0, 2).map((post, index) => (
            <motion.a
              key={post.slug}
              href={`#blog/${post.slug}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group p-8 border border-[#1F1F1F] bg-[#0A0A0A] hover:border-[#00FF00]/40 transition-all"
            >
              <div className="text-[10px] font-mono text-[#00FF00] mb-4 uppercase tracking-widest">Blog {index + 1}</div>
              <h4 className="text-2xl font-bold mb-4 group-hover:text-[#00FF00] transition-colors">{post.title}</h4>
              <p className="text-white/40 leading-relaxed mb-6">
                Read my latest security insights, written as markdown so I can publish new content quickly.
              </p>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#00FF00] font-bold">
                Open Post
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function BlogListPage({ posts }: { posts: BlogPostEntry[] }) {
  return (
    <section className="pt-32 pb-20 px-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <a href="#" className="text-sm font-mono uppercase tracking-[0.35em] text-white/40 hover:text-[#00FF00] transition-colors">
            ← Back to portfolio
          </a>
          <h2 className="text-[10px] uppercase tracking-[0.4em] text-[#00FF00] mb-4 font-mono">/ Blog Archive</h2>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter">All blog posts.</h1>
          <p className="max-w-2xl mt-6 text-white/40 leading-relaxed text-lg">
            These posts are written in markdown and published directly from the repo. Click any entry to read the full write-up.
          </p>
        </div>
        <div className="grid gap-6">
          {posts.map((post) => (
            <motion.a
              key={post.slug}
              href={`#blog/${post.slug}`}
              whileHover={{ y: -2 }}
              className="group block rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-8 transition-all hover:border-[#00FF00]/40"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#00FF00] font-mono">Article</span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">{post.slug}</span>
              </div>
              <h3 className="text-3xl font-bold mb-4 group-hover:text-[#00FF00] transition-colors">{post.title}</h3>
              <p className="text-white/50">Published directly from markdown sources in the repo.</p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function BlogPostPage({ post }: { post?: BlogPostEntry }) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!post) return;
    setLoading(true);
    post.loader().then((text) => {
      setContent(text);
      setLoading(false);
    });
  }, [post]);

  if (!post) {
    return (
      <section className="pt-32 pb-20 px-6 min-h-screen">
        <div className="max-w-5xl mx-auto text-center">
          <a href="#blogs" className="text-sm font-mono uppercase tracking-[0.35em] text-white/40 hover:text-[#00FF00] transition-colors">
            ← Back to blog list
          </a>
          <h1 className="text-5xl font-bold tracking-tighter mt-10">Blog post not found</h1>
          <p className="mt-6 text-white/40">The requested blog was not found in the repository. Please return to the blog archive.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-32 pb-20 px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <a href="#blogs" className="text-sm font-mono uppercase tracking-[0.35em] text-white/40 hover:text-[#00FF00] transition-colors">
          ← Back to blog list
        </a>
        <div className="mt-12 mb-10">
          <div className="text-[10px] uppercase tracking-[0.4em] text-[#00FF00] mb-4 font-mono">/ Blog Post</div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter">{post.title}</h1>
        </div>
        <div className="rounded-3xl border border-[#1F1F1F] bg-[#0A0A0A] p-10">
          {loading ? (
            <div className="text-white/50">Loading blog content...</div>
          ) : (
            renderMarkdown(content)
          )}
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#1F1F1F]">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 font-mono text-sm tracking-tighter"
        >
          <span className="text-[#00FF00] font-bold">thetechnofeak</span>
          <span className="text-white/20">|</span>
          <span className="text-white/40 uppercase tracking-widest text-[10px]">Abhishek Shukla</span>
        </motion.div>
        <div className="hidden md:flex items-center gap-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
          {["About", "Work", "Skills", "Certifications", "Blogs", "Contact"].map((item) => (
            <motion.a
              key={item}
              href={`#${item === "Work" ? "work" : item === "Blogs" ? "blogs" : item.toLowerCase()}`}
              whileHover={{ color: "#00FF00" }}
              className="transition-colors"
            >
              {item}
            </motion.a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/AVI-SHUKLA1110" target="_blank" rel="noopener noreferrer">
            <Github className="w-4 h-4 text-white/40 hover:text-[#00FF00] transition-colors" />
          </a>
          <a href="https://x.com/thetechnofeak" target="_blank" rel="noopener noreferrer">
            <Twitter className="w-4 h-4 text-white/40 hover:text-[#00FF00] transition-colors" />
          </a>
          <a href="https://www.linkedin.com/in/abhishek-shukla-a549541b7/" target="_blank" rel="noopener noreferrer">
            <Linkedin className="w-4 h-4 text-white/40 hover:text-[#00FF00] transition-colors" />
          </a>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00FF00]/20 bg-[#00FF00]/5 text-[#00FF00] text-[10px] font-mono uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF00] animate-pulse" />
                System Status: Secure
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/40 text-[10px] font-mono uppercase tracking-widest">
                Security Engineer
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[0.95]">
              Abhishek Shukla. <br />
              <span className="text-[#00FF00]">Security Engineer.</span>
            </h1>
            <p className="max-w-md text-lg text-white/40 font-light leading-relaxed mb-8">
              I build tools to detect and mitigate modern attack vectors, specializing in vulnerability analysis, incident response ,application Security and DevSecOps.
            </p>
            <div className="flex flex-wrap gap-4">
              <motion.a 
                href="#work"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#00FF00] text-black px-6 py-3 rounded-sm text-[11px] font-bold uppercase tracking-widest hover:bg-[#00FF00]/90 transition-colors"
              >
                View Work
              </motion.a>
              <motion.a 
                href="#contact"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="border border-white/10 px-6 py-3 rounded-sm text-[11px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
              >
                Establish Connection
              </motion.a>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="aspect-square rounded-full border border-[#1F1F1F] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-radial-gradient from-[#00FF00]/10 to-transparent blur-3xl opacity-50" />
              <div className="w-3/4 h-3/4 rounded-full border border-[#00FF00]/20 border-dashed animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-32 h-32 text-[#00FF00]/20" />
              </div>
              <div className="absolute top-1/4 right-1/4 bg-[#0A0A0A] border border-[#1F1F1F] p-4 rounded-lg shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-3 h-3 text-[#00FF00]" />
                  <span className="text-[10px] font-mono text-white/40">avi@terminal</span>
                </div>
                <div className="font-mono text-[10px] text-[#00FF00] space-y-1">
                  <div>$ npx vet scan .</div>
                  <div className="text-white/40">Scanning dependencies...</div>
                  <div className="text-white/40">Analysis complete: 0 vulnerabilities</div>
                  <div>$ status: 200 OK</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="py-32 px-6 border-b border-[#1F1F1F]">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-[#00FF00] mb-8 font-mono">/ Introduction</h2>
            <h3 className="text-4xl md:text-5xl font-bold tracking-tighter mb-8 leading-tight">
              Securing the software lifecycle through <span className="text-[#00FF00]">engineering</span> and <span className="text-[#00FF00]">automation with a security mindset</span>.
            </h3>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="space-y-6 text-lg text-white/40 leading-relaxed font-light"
          >
            <p>
              I am a Security Analyst specialising in DevSecops and Product Security Engineering dedicated to identifying and mitigating security risks across the entire software development lifecycle. My work focuses on leveraging security automation and tooling to reduce
MTTR and harden infrastructure against evolving threats.
            </p>
            <p>
              My philosophy is simple: <span className="text-[#00FF00] italic">Automate the known, investigate the unknown.</span> I believe in empowering developers with security tooling that is both powerful and seamless.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const PROJECTS = [
  {
     title: "vet",
    description: "Devsecop CI/CD Secure pipeline.",
    tags: ["Supply Chain", "Security", "Python"],
    link: "#",
  },
  {
    title: "MCP Hacking server",
    description: "Hacking MCP server built on docker utilising vulnerality scanning tools",
    tags: ["Malware", "Detection", "Security"],
    link: "#",
  },
];

function Projects() {
  return (
    <section id="work" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-[#00FF00] mb-4 font-mono">
              / Work Done
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold tracking-tighter">
              Selected Contributions.
            </h3>
          </div>

          <p className="max-w-xs text-white/40 text-[11px] leading-relaxed font-mono uppercase tracking-wider">
            A collection of open-source tools and security projects focused on
            securing the modern software supply chain.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((project, i) => (
            <motion.a
              key={project.title}
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group p-6 border border-[#1F1F1F] bg-[#0A0A0A] hover:border-[#00FF00]/40 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-4 h-4 text-[#00FF00]" />
              </div>

              <div className="text-[10px] font-mono text-white/20 mb-4 uppercase tracking-widest">
                Project 0{i + 1}
              </div>

              <h4 className="text-xl font-bold mb-3 group-hover:text-[#00FF00] transition-colors">
                {project.title}
              </h4>

              <p className="text-sm text-white/40 leading-relaxed mb-6 h-12 overflow-hidden">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] font-mono px-2 py-0.5 border border-white/10 text-white/40 uppercase tracking-widest"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

const SKILLS = [
  { category: "Application Security", items: ["SAST", "DAST", "SCA", "Threat Modeling", "OWASP Top 10", "Secure SDLC", "Vulnerability Management"] },
  { category : "Security Operations", items: [ "Threat Detection & Analysis", "Incident Response", "ISO 27001","Vulnerability Assessment","Kill Chain Analysis", "MITRE ATT&CK", "NIST" ] },
  { category: "Tooling", items: ["Semgrep", " SIEM", " EDR/XDR ", " SentinelOne", " Metasploit", " Nessus ", "Nmap ", "Burp Suite", " SOAR", " AD"] },
  { category: "Infrastructure", items: ["AWS", "Terraform", "GitHub Actions", "Docker", "DevSecOps", "Jenkins"] },
  { category: "Languages", items: ["Python", "Go", "JavaScript", "Bash", "Solidity"] },
];

function Certifications() {
  return (
    <section id="certifications" className="py-32 px-6 border-b border-[#1F1F1F]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-[#00FF00] mb-4 font-mono">/ Credentials</h2>
            <h3 className="text-4xl md:text-5xl font-bold tracking-tighter">Certifications.</h3>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <motion.a
            href="https://www.credly.com/badges/13189836-8258-4550-80e1-2cdedddc093e/public_url/"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group p-8 border border-[#1F1F1F] bg-[#0A0A0A] hover:border-[#00FF00]/40 transition-all relative overflow-hidden flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] font-mono text-[#00FF00] mb-2 uppercase tracking-widest">IBM</div>
              <h4 className="text-2xl font-bold group-hover:text-[#00FF00] transition-colors">IBM Cybersecurity Analyst Professional</h4>
              <p className="text-sm text-white/40 mt-2">IBM Cybersecurity Analyst Professional Certificate</p>
            </div>
            <ExternalLink className="w-6 h-6 text-white/20 group-hover:text-[#00FF00] transition-colors" />
          </motion.a>
          <motion.a
            href=""
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group p-8 border border-[#1F1F1F] bg-[#0A0A0A] hover:border-[#00FF00]/40 transition-all relative overflow-hidden flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] font-mono text-[#00FF00] mb-2 uppercase tracking-widest">Cybermentor</div>
              <h4 className="text-2xl font-bold group-hover:text-[#00FF00] transition-colors">Tcm Security</h4>
              <p className="text-sm text-white/40 mt-2">Practical Ethical Hacking</p>
            </div>
            <ExternalLink className="w-6 h-6 text-white/20 group-hover:text-[#00FF00] transition-colors" />
          </motion.a>
          <motion.a
            href="https://www.udemy.com/certificate/UC-28d3fc91-5494-4f51-aef8-9b364c6523d8/"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group p-8 border border-[#1F1F1F] bg-[#0A0A0A] hover:border-[#00FF00]/40 transition-all relative overflow-hidden flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] font-mono text-[#00FF00] mb-2 uppercase tracking-widest">Udemy</div>
              <h4 className="text-2xl font-bold group-hover:text-[#00FF00] transition-colors">Burpsuite Deep Dive</h4>
              <p className="text-sm text-white/40 mt-2"></p>
            </div>
            <ExternalLink className="w-6 h-6 text-white/20 group-hover:text-[#00FF00] transition-colors" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}

function Expertise() {
  return (
    <section id="skills" className="py-32 px-6 bg-[#0F0F0F]">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-[#00FF00] mb-8 font-mono">/ Skills & Expertise</h2>
            <h3 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 leading-tight">
              A specialized stack for <span className="text-[#00FF00]">modern</span> security challenges.
            </h3>
            <p className="text-lg text-white/40 leading-relaxed mb-12">
              My technical expertise spans from Security Operations analysis to Security architecture and engineering. I leverage automation to scale security practices without compromising on depth.
            </p>
            <div className="p-6 border border-[#1F1F1F] bg-[#0A0A0A] rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-[#00FF00]" />
                <span className="text-xs font-mono uppercase tracking-widest">Core Focus</span>
              </div>
              <p className="text-[11px] font-mono text-white/40 leading-relaxed italic">
                "Building resilient systems requires a deep understanding of how they break. I bridge the gap between security analysis and engineering."
              </p>
            </div>
          </div>
          <div className="grid gap-8">
            {SKILLS.map((skill) => (
              <div key={skill.category} className="p-8 border border-[#1F1F1F] bg-[#0A0A0A] relative group">
                <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-[#00FF00] transition-all duration-500" />
                <h4 className="text-xs font-mono uppercase tracking-[0.3em] text-white/20 mb-6">{skill.category}</h4>
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  {skill.items.map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-[#00FF00]" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="py-32 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/40 text-[10px] font-mono uppercase tracking-widest mb-12">
          Secure Channel
        </div>
        <h3 className="text-5xl md:text-7xl font-bold tracking-tighter mb-12">
          Establish <br /> Connection.
        </h3>
        <div className="flex flex-col items-center gap-8">
          <motion.a 
            href="mailto:ashikla693@gmail.com" 
            whileHover={{ scale: 1.05 }}
            className="text-2xl md:text-4xl font-mono font-bold text-[#00FF00] border-b-2 border-[#00FF00]/20 pb-2"
          >
            ashikla693@gmail.com
          </motion.a>
          <div className="flex gap-8 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
            <a href="https://github.com/AVI-SHUKLA1110" target="_blank" rel="noopener noreferrer" className="hover:text-[#00FF00] transition-colors">GitHub</a>
            <a href="https://x.com/thetechnofeak" target="_blank" rel="noopener noreferrer" className="hover:text-[#00FF00] transition-colors">Twitter</a>
            <a href="https://www.linkedin.com/in/abhishek-shukla-a549541b7" target="_blank" rel="noopener noreferrer" className="hover:text-[#00FF00] transition-colors">LinkedIn</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[#1F1F1F]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
          © {new Date().getFullYear()} AVI-SHUKLA1110 // Abhishek Shukla
        </div>
        <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF00]" />
          Encrypted Session Active
        </div>
      </div>
    </footer>
  );
}