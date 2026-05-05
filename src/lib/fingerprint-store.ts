/**
 * NigWrite - Fingerprint Store
 * Expanded Academic Reference Corpus
 * Created by: Wabi The Tech Nurse
 *
 * Comprehensive in-memory hash storage simulating an Elasticsearch
 * fingerprint index. Seeded with a wide variety of academic sources
 * across multiple disciplines for authentic plagiarism matching.
 */

import { WinnowingEngine } from './winnowing-engine';

interface FingerprintEntry {
  hash: number;
  documentId: string;
  position: number;
  ngram: string;
  sourceTitle: string;
  sourceUrl?: string;
}

class FingerprintStore {
  private store: Map<number, FingerprintEntry[]>;

  constructor() {
    this.store = new Map();
  }

  indexFingerprints(fingerprints: FingerprintEntry[]): void {
    for (const fp of fingerprints) {
      const existing = this.store.get(fp.hash) || [];
      existing.push(fp);
      this.store.set(fp.hash, existing);
    }
  }

  search(hashes: number[]): Map<number, FingerprintEntry[]> {
    const matches = new Map<number, FingerprintEntry[]>();
    for (const hash of hashes) {
      const entries = this.store.get(hash);
      if (entries && entries.length > 0) {
        matches.set(hash, [...entries]);
      }
    }
    return matches;
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  /**
   * Comprehensive academic reference corpus across multiple disciplines.
   * Covers Computer Science, Medicine, Business, Education, Engineering,
   * Environmental Science, Social Sciences, and more.
   */
  seedSampleData(): void {
    const sampleDocuments = [
      // ── Computer Science ──
      {
        id: "cs-001",
        title: "Introduction to Machine Learning",
        url: "https://scholar.google.com/ml-intro-2023",
        content: "Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data. These systems improve their performance on a specific task over time without being explicitly programmed. Machine learning algorithms use historical data as input to predict new output values. Supervised learning, unsupervised learning, and reinforcement learning are the three main types of machine learning. Deep learning is a specialized branch that uses neural networks with many layers to analyze various factors of data. The field has seen remarkable advances in recent years, particularly in areas such as image recognition, natural language processing, and autonomous vehicles."
      },
      {
        id: "cs-002",
        title: "Data Structures and Algorithms: A Comprehensive Review",
        url: "https://scholar.google.com/dsa-review",
        content: "Data structures are fundamental building blocks in computer science that organize and store data efficiently. Common data structures include arrays, linked lists, stacks, queues, trees, and graphs. Each data structure has its own strengths and weaknesses, making it suitable for different types of applications. Algorithms are step-by-step procedures for solving computational problems. The efficiency of an algorithm is typically measured using Big O notation, which describes how the running time grows relative to the input size. Understanding data structures and algorithms is essential for writing efficient and scalable software applications."
      },
      {
        id: "cs-003",
        title: "Advances in Quantum Computing and Information Theory",
        url: "https://scholar.google.com/quantum-computing-2024",
        content: "Quantum computing represents a paradigm shift in computational technology, leveraging the principles of quantum mechanics to process information in fundamentally new ways. Unlike classical computers that use bits representing either zero or one, quantum computers use quantum bits or qubits, which can exist in a superposition of states simultaneously. This property enables quantum computers to explore multiple solutions to a problem at the same time, offering exponential speedups for certain classes of computations. Key applications include cryptography, drug discovery, optimization problems, and simulating complex molecular interactions. Major technology companies including IBM, Google, and Microsoft have invested heavily in quantum computing research."
      },
      {
        id: "cs-004",
        title: "The Evolution of Artificial Intelligence: From Expert Systems to Deep Learning",
        url: "https://scholar.google.com/ai-evolution",
        content: "Artificial intelligence has evolved significantly since its inception in the mid-twentieth century. Early AI systems relied on rule-based approaches and expert systems that encoded human knowledge in the form of if-then rules. The development of machine learning in the 1980s and 1990s shifted the focus towards statistical approaches that could learn patterns from data. The breakthrough in deep learning, catalyzed by the availability of large datasets and powerful computing hardware, has led to unprecedented performance in tasks such as image classification, speech recognition, and language translation. Modern large language models represent the cutting edge of artificial intelligence, demonstrating capabilities that were previously thought to require human-level intelligence."
      },
      {
        id: "cs-005",
        title: "Cybersecurity Threats and Defense Mechanisms in the Digital Age",
        url: "https://scholar.google.com/cybersecurity-threats",
        content: "Cybersecurity has become one of the most critical concerns for organizations and individuals in the digital age. Common cyber threats include malware, phishing attacks, ransomware, social engineering, and distributed denial-of-service attacks. These threats can result in significant financial losses, data breaches, and damage to organizational reputation. Defense mechanisms include firewalls, intrusion detection systems, encryption, multi-factor authentication, and employee security awareness training. The field of cybersecurity is constantly evolving as attackers develop new techniques and defenders create more sophisticated countermeasures."
      },

      // ── Medicine & Health Sciences ──
      {
        id: "med-001",
        title: "The Impact of COVID-19 on Global Public Health Systems",
        url: "https://scholar.google.com/covid19-public-health",
        content: "The COVID-19 pandemic has had a profound and lasting impact on global public health systems. Healthcare infrastructure in many countries was overwhelmed by the surge in cases, exposing critical weaknesses in pandemic preparedness and response. The pandemic accelerated the adoption of telemedicine and digital health technologies, transforming how healthcare is delivered. Vaccine development achieved unprecedented speed with mRNA technology platforms demonstrating remarkable efficacy. Mental health consequences of the pandemic, including increased rates of anxiety, depression, and social isolation, continue to affect populations worldwide. Lessons learned from COVID-19 are reshaping public health policy and emergency response frameworks."
      },
      {
        id: "med-002",
        title: "Antibiotic Resistance: A Growing Global Health Crisis",
        url: "https://scholar.google.com/antibiotic-resistance",
        content: "Antibiotic resistance has emerged as one of the most pressing global health challenges of the twenty-first century. The overuse and misuse of antibiotics in both human medicine and agriculture has accelerated the evolution of drug-resistant bacteria. Methicillin-resistant Staphylococcus aureus (MRSA) and multidrug-resistant tuberculosis are among the most dangerous resistant organisms. The World Health Organization has warned that without urgent action, we could enter a post-antibiotic era where common infections become untreatable. Strategies to combat antibiotic resistance include improved stewardship programs, development of new antimicrobial agents, and investment in alternative therapies such as phage therapy and immunotherapies."
      },
      {
        id: "med-003",
        title: "Mental Health Awareness and Treatment in Modern Society",
        url: "https://scholar.google.com/mental-health-awareness",
        content: "Mental health is an integral component of overall well-being, yet it has historically been stigmatized and underfunded compared to physical health. Depression, anxiety disorders, bipolar disorder, and schizophrenia are among the most prevalent mental health conditions globally. Early intervention and access to evidence-based treatments, including cognitive behavioral therapy and psychopharmacology, significantly improve outcomes. The integration of mental health services into primary care settings has shown promise in increasing access to treatment. Workplace mental health programs and school-based counseling services are essential components of a comprehensive public mental health strategy."
      },

      // ── Environmental Science ──
      {
        id: "env-001",
        title: "Climate Change and Global Warming: Causes, Effects, and Solutions",
        url: "https://scholar.google.com/climate-change-2024",
        content: "Climate change refers to long-term shifts in global temperatures and weather patterns. While natural processes can cause climate variations, since the 1800s human activities have been the main driver of climate change, primarily due to the burning of fossil fuels like coal, oil, and gas. Global warming is the long-term heating of Earth's surface observed since the pre-industrial period due to human activities. The primary cause of global warming is the greenhouse effect, where certain gases in Earth's atmosphere trap heat. Carbon dioxide, methane, and nitrous oxide are the primary greenhouse gases. Rising sea levels, melting ice caps, and increasing frequency of extreme weather events are among the most visible consequences of climate change."
      },
      {
        id: "env-002",
        title: "Biodiversity Loss and Ecosystem Degradation",
        url: "https://scholar.google.com/biodiversity-loss",
        content: "Biodiversity loss is occurring at an unprecedented rate, with scientists estimating that species are going extinct at rates hundreds of times higher than natural background levels. Habitat destruction, pollution, overexploitation, invasive species, and climate change are the primary drivers of biodiversity decline. Ecosystem degradation undermines the essential services that nature provides to humanity, including clean water, pollination, soil fertility, and climate regulation. Conservation strategies such as protected area networks, habitat restoration, and sustainable land management practices are critical for preserving biodiversity. International agreements like the Convention on Biological Diversity aim to coordinate global conservation efforts."
      },
      {
        id: "env-003",
        title: "Renewable Energy Transition and Sustainable Development",
        url: "https://scholar.google.com/renewable-energy-sd",
        content: "The transition from fossil fuels to renewable energy sources is essential for achieving sustainable development and mitigating climate change. Solar, wind, hydroelectric, and geothermal energy have become increasingly cost-competitive with traditional fossil fuel sources. The International Energy Agency projects that renewable energy will account for the majority of global electricity generation by 2030. Energy storage technologies, particularly lithium-ion batteries, are critical for managing the intermittency of solar and wind power. Developing nations face unique challenges in the energy transition, requiring international cooperation and technology transfer to ensure equitable access to clean energy solutions."
      },

      // ── Social Sciences ──
      {
        id: "soc-001",
        title: "The Impact of Social Media on Society and Democracy",
        url: "https://scholar.google.com/social-media-impact",
        content: "Social media has fundamentally transformed the way people communicate and interact with each other. Platforms like Facebook, Twitter, and Instagram have created new avenues for connection while also raising concerns about privacy, mental health, and the spread of misinformation. The rise of social media has democratized information sharing, allowing individuals to reach global audiences instantly. However, the algorithmic curation of content on these platforms has led to the formation of echo chambers, where users are primarily exposed to information that reinforces their existing beliefs. Studies have shown that excessive social media use can contribute to feelings of anxiety, depression, and loneliness, particularly among young people."
      },
      {
        id: "soc-002",
        title: "Globalization and Its Effects on Developing Economies",
        url: "https://scholar.google.com/globalization-dev-econ",
        content: "Globalization has profoundly shaped economic development patterns across the world, creating both opportunities and challenges for developing nations. International trade liberalization has opened new markets for goods and services, contributing to economic growth in many developing countries. Foreign direct investment has brought capital, technology, and expertise to emerging economies, creating jobs and stimulating industrial development. However, globalization has also been associated with increased income inequality, environmental degradation, and the erosion of local cultural practices. The phenomenon of brain drain, where skilled professionals emigrate from developing to developed countries, further compounds the challenges faced by developing nations."
      },
      {
        id: "soc-003",
        title: "Gender Equality and Women's Empowerment in the 21st Century",
        url: "https://scholar.google.com/gender-equality-21c",
        content: "Gender equality remains a fundamental human rights challenge and a necessary foundation for a peaceful, prosperous, and sustainable world. Despite significant progress in recent decades, women continue to face discrimination in education, employment, political participation, and access to healthcare. The gender pay gap persists across all industries and regions, with women earning approximately seventy-seven cents for every dollar earned by men. Women's empowerment through education, economic opportunity, and political representation has been shown to drive economic growth and improve health outcomes for entire communities. Legislative reforms and corporate gender diversity initiatives are important tools for advancing gender equality."
      },

      // ── Business & Economics ──
      {
        id: "biz-001",
        title: "Digital Transformation in Modern Business",
        url: "https://scholar.google.com/digital-transformation",
        content: "Digital transformation refers to the integration of digital technology into all areas of a business, fundamentally changing how organizations operate and deliver value to customers. Cloud computing, artificial intelligence, big data analytics, and the Internet of Things are key technologies driving digital transformation across industries. Companies that successfully embrace digital transformation gain competitive advantages through improved operational efficiency, enhanced customer experiences, and the ability to develop innovative new business models. However, digital transformation initiatives often face significant challenges, including organizational resistance to change, legacy system integration, cybersecurity concerns, and the need for workforce upskilling."
      },
      {
        id: "biz-002",
        title: "Entrepreneurship and Innovation in the African Context",
        url: "https://scholar.google.com/african-entrepreneurship",
        content: "Entrepreneurship has emerged as a powerful engine of economic growth and innovation across the African continent. Africa's young and rapidly growing population presents both a demographic dividend and a challenge for job creation. The mobile technology revolution has created new opportunities for African entrepreneurs to develop innovative solutions tailored to local needs. Fintech startups have been particularly successful, leveraging mobile money platforms to provide financial services to previously unbanked populations. Despite these successes, African entrepreneurs continue to face significant barriers including limited access to capital, inadequate infrastructure, regulatory hurdles, and political instability in some regions."
      },

      // ── Education ──
      {
        id: "edu-001",
        title: "Online Learning and Educational Technology Trends",
        url: "https://scholar.google.com/online-learning-edtech",
        content: "Online learning has experienced explosive growth, accelerated by the COVID-19 pandemic and advances in educational technology. Learning management systems, video conferencing platforms, and interactive educational tools have made remote education more accessible than ever before. Massive Open Online Courses (MOOCs) have democratized access to high-quality educational content from prestigious institutions worldwide. However, the shift to online learning has highlighted significant disparities in digital access and technological literacy across different socioeconomic groups. Blended learning approaches that combine online and in-person instruction have shown promise in optimizing learning outcomes while maintaining flexibility for diverse learner needs."
      },
      {
        id: "edu-002",
        title: "Academic Integrity in Higher Education: Challenges and Solutions",
        url: "https://scholar.google.com/academic-integrity",
        content: "Academic integrity is a cornerstone of higher education, ensuring that degrees and qualifications accurately reflect genuine learning and achievement. Plagiarism, contract cheating, and unauthorized collaboration represent serious threats to academic integrity in universities worldwide. The rise of artificial intelligence tools capable of generating human-like text has created new challenges for educators in detecting and preventing academic dishonesty. Institutions are responding through a combination of technology-based detection tools, honor codes, educational programs that teach proper citation practices, and assessment redesign that emphasizes authentic learning demonstrations. Building a culture of integrity requires collaboration between faculty, students, and administrators."
      },

      // ── Engineering ──
      {
        id: "eng-001",
        title: "Sustainable Engineering and Green Building Design",
        url: "https://scholar.google.com/sustainable-engineering",
        content: "Sustainable engineering aims to design and operate systems that use energy and resources sustainably while minimizing environmental impact. Green building design incorporates energy-efficient materials, renewable energy systems, water conservation features, and indoor environmental quality improvements. Leadership in Energy and Environmental Design (LEED) certification provides a widely recognized framework for evaluating building sustainability. Life cycle assessment methodology enables engineers to evaluate the total environmental impact of products and processes from raw material extraction through disposal. The circular economy concept, which emphasizes designing for reuse, recycling, and resource recovery, is transforming traditional engineering approaches."
      },
      {
        id: "eng-002",
        title: "The Internet of Things: Connecting the Physical and Digital Worlds",
        url: "https://scholar.google.com/iot-connected-worlds",
        content: "The Internet of Things (IoT) refers to the network of physical devices embedded with sensors, software, and connectivity that enables them to collect and exchange data. Smart home devices, wearable fitness trackers, industrial monitoring systems, and connected vehicles are all examples of IoT applications that are transforming daily life and industrial processes. The proliferation of IoT devices generates enormous volumes of data, creating both opportunities for data-driven decision making and challenges for data management and privacy protection. Edge computing, which processes data closer to where it is generated, is emerging as a key architectural pattern for managing IoT workloads efficiently."
      },

      // ── History & Culture ──
      {
        id: "hist-001",
        title: "The History of the Internet and the World Wide Web",
        url: "https://scholar.google.com/internet-history-www",
        content: "The Internet originated from ARPANET, a project funded by the United States Department of Defense in the late 1960s. The initial goal was to create a decentralized communication network that could withstand a nuclear attack. In 1989, Tim Berners-Lee invented the World Wide Web, which revolutionized how information was shared and accessed over the Internet. The introduction of web browsers in the early 1990s made the Internet accessible to the general public, leading to explosive growth in users and content. E-commerce, social networking, cloud computing, and mobile connectivity have all emerged as transformative applications built upon the Internet's infrastructure. Today, over five billion people worldwide have Internet access."
      },
      {
        id: "hist-002",
        title: "Nigerian History: From Independence to the Modern Era",
        url: "https://scholar.google.com/nigerian-history",
        content: "Nigeria gained independence from British colonial rule on October 1, 1960, becoming the most populous country in Africa. The early post-independence period was marked by political instability, including a civil war from 1967 to 1970 that resulted in tremendous loss of life and displacement. The discovery and exploitation of oil reserves in the Niger Delta region transformed Nigeria's economy but also created challenges related to resource management, environmental degradation, and equitable distribution of wealth. Nigeria has played a significant role in regional and international affairs, contributing troops to peacekeeping missions and serving as a leader in the African Union and Economic Community of West African States."
      },
    ];

    const engine = new WinnowingEngine();

    for (const doc of sampleDocuments) {
      const fingerprints = engine.generateFingerprints(doc.content);
      const entries: FingerprintEntry[] = fingerprints.map(fp => ({
        hash: fp.hash,
        documentId: doc.id,
        position: fp.position,
        ngram: fp.ngram,
        sourceTitle: doc.title,
        sourceUrl: doc.url,
      }));
      this.indexFingerprints(entries);
    }
  }
}

let instance: FingerprintStore | null = null;

export function getFingerprintStore(): FingerprintStore {
  if (!instance) {
    instance = new FingerprintStore();
    instance.seedSampleData();
  }
  return instance;
}

export type { FingerprintEntry };
