export default {
  value: {
    title: ["Your business already has the logic.", "I draw the lines."],
    titleItalic: "lines",
    keywordsLine: "Marketing and AI automation for businesses in Lanzarote",
    subtitle: "I'm a full-stack developer who designs, builds and maintains the websites, automations and AI agents your business relies on every day."
  },
  marquee: {
    phrases: [
      "Systems that work for you",
      "Logic before tools",
      "Code you can maintain",
      "Automation with judgment"
    ]
  },
  thesis: {
    // Crema+ámbar juego: keyword at the end in amber (one span per title;
    // Thesis.astro injects the HTML via set:html).
    title: 'First the logic. Then the <span class="text-primary">technology</span>.'
  },
  nav: {
    benefits: "Benefits",
    services: "Services",
    process: "Our process",
    reason: "Reasons",
    faq: "FAQ"
  },
  hero: {
    leftTitle: "Automate your",
    leftFancy: "success",
    rightTitle: "Multiply your",
    rightFancy: "impact"
  },
  benefits: {
    title: '<span class="text-primary">Optimize,</span> Accelerate and <span class="text-primary">Automate</span>',
    subtitle: "Reduce operating costs and eliminate repetitive tasks with intelligent solutions that improve efficiency and accuracy in every process."
  },
  services: {
    // One-word title: fully amber (default decision of this round).
    title: '<span class="text-primary">Services</span>',
    subtitle: "Automation and artificial intelligence designed to boost your business.",
    view: "View service"
  },
  process: {
    title: 'Our <span class="text-primary">process</span>',
    subtitle: "Proven methodology that guarantees results. Each step is designed to maximize the success of your digital transformation.",
    steps: [
      {
        step: "01",
        title: "System Discovery",
        description: "We understand how your business works before automating it.",
        items: ["Current process analysis", "Repetitive task identification", "Bottleneck detection", "Identification of time and efficiency losses"]
      },
      {
        step: "02",
        title: "Logical Design",
        description: "We design the system logic, not just the flows.",
        items: ["Process diagrams", "Rules and decisions", "Scenarios and exceptions", "System architecture"]
      },
      {
        step: "03",
        title: "Intelligent Implementation",
        description: "We convert the design into real automations with AI.",
        items: ["Automated flows", "Tool integrations", "Business-trained AI", "Functional and stable systems"]
      },
      {
        step: "04",
        title: "Optimization & Evolution",
        description: "The system doesn't just maintain. It evolves.",
        items: ["Real environment testing", "Logic and automation adjustments", "Continuous optimization", "Preparation for scaling"]
      }
    ],
    quote: "“Each step is designed to reduce friction, eliminate manual work, and build scalable systems from day one.”"
  },
  reasons: {
    // "Logic" and "Lines" in amber with the "&" in cream (inherits the h2 color):
    // 2-span pattern from the main legacy.
    title: 'Why choose <span class="text-primary">Logic</span> & <span class="text-primary">Lines</span>?',
    subtitle: "We combine technical expertise with a focus on business results.",
    items: [
      {
        title: "Fast Results",
        text: "Agile implementation that generates value from day one"
      },
      {
        title: "Guaranteed Security",
        text: "Data protection and regulatory compliance in every solution"
      },
      {
        title: "Absolute Precision",
        text: "AI trained specifically for your needs"
      },
      {
        title: "Time Savings",
        text: "Reduce time on repetitive tasks by up to 85%"
      },
      {
        title: "Scalability",
        text: "Grow without limits with flexible infrastructure"
      },
      {
        title: "Continuous Support",
        text: "Expert team available to help you always"
      }
    ]
  },
  prices: {
    title: "Our Prices",
  },
  stats: {
    title: '<span class="text-primary">Results</span> <span class="text-(--color-text-dark)">that speak</span>',
    subtitle: "Real metrics from our clients who trust us",
    items: [
      {
        value: "1,240",
        label: "hours automated"
      },
      {
        value: "38",
        label: "websites and systems"
      },
      {
        value: "6",
        label: "service lines"
      }
    ],
    // Screen-reader-only description of the GrowthChart graphic.
    chartDescription: "Illustrative chart: a tangle of lines settles into a grid and the amber line draws a steady growth trend, with small dips, up to the top right corner.",
    // Visible GrowthChart copy: kicker + 3 lines synced with the scrub phases
    // (tangle / grid / growth). Amber word in italics.
    chartKicker: "From chaos to growth",
    chartPhase1: 'Everything is <em class="italic text-primary">tangled</em>.',
    chartPhase2: 'I bring <em class="italic text-primary">order</em>.',
    chartPhase3: 'And it <em class="italic text-primary">grows</em>.',
    chartSentence: "From chaos to order to growth."
  },
  faq: {
    title: 'Frequently asked <span class="text-primary">questions</span>'
  },
  seo: {
    contactTitle: "Contact",
    contactDescription: "Get in touch with Logic & Lines for a free AI and automation consultation for your business."
  },
  contact: {
    title: "Contact me",
    info: "Info",
    reachMe: "Where to reach me",
    thankYou: "Thank you for your interest in Logic & Lines.",
    preparation: "Our website is currently undergoing final preparations.",
    offering: "In the meantime, we offer our consulting services.",
    bookSession: "If you'd like to book a session or learn more, feel free to contact me.",
    lookForward: "I look forward to welcoming you soon!"
  },
  location: {
    title: "¿Qué opinan de nosotros?",
    address: "Contratar sus servicios de automatización con inteligencia artificial ha sido una de las mejores decisiones para mi negocio. Antes perdía mucho tiempo en tareas repetitivas y procesos manuales, pero gracias a sus soluciones todo es ahora más rápido, eficiente y organizado.",
    hours: "Lo que más valoro es su capacidad para entender exactamente las necesidades de mi empresa y transformarlas en automatizaciones prácticas y fáciles de usar. Además, el acompañamiento y la atención al detalle han sido excelentes en todo momento.",
    schedule: "Hoy puedo centrarme en hacer crecer mi negocio mientras la inteligencia artificial se encarga del trabajo operativo. Sin duda, un servicio altamente profesional y totalmente recomendable.",
    opening: "Next opening soon!"
  },
  buttons: {
    book: "Book your call"
  },
  booking: {
    title: 'The next step is a <span class="text-primary">conversation</span>',
    text: "Select the day and time that best suits you for our initial meeting. In this consultation we will analyze your business and propose the best strategy.",
    button: "Book your call",
    footer: "No commitment · 30 minutes"
  },
  footer: {
    copyright: "© {year} Logic & Lines. All rights reserved.",
    home: "Home",
    contact: "Contact"
  },
  privacy: {
    link: "Privacy Policy",
    cookies: "Cookie Settings"
  }
};
