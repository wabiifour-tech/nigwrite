/**
 * NigWrite - Fingerprint Store
 * Expanded Academic Reference Corpus (60+ documents, 10 disciplines)
 * Created by: Wabi The Tech Nurse
 *
 * Comprehensive in-memory hash storage simulating an Elasticsearch
 * fingerprint index. Seeded with a wide variety of academic sources
 * across multiple disciplines for authentic plagiarism matching.
 */

import { WinnowingEngine } from './winnowing-engine';

export interface FingerprintEntry {
  hash: number;
  documentId: string;
  position: number;
  ngram: string;
  sourceTitle: string;
  sourceUrl?: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
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
   * Comprehensive academic reference corpus across 10 disciplines.
   * Covers Computer Science, Medicine, Environmental Science,
   * Social Sciences, Business & Economics, Education, Engineering,
   * History & Culture, Law & Politics, and Agriculture.
   */
  seedSampleData(): void {
    const sampleDocuments: { id: string; title: string; url: string; content: string }[] = [

      // ═══════════════════════════════════════════════════════
      // ── 1. COMPUTER SCIENCE (8 documents) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "cs-001",
        title: "Introduction to Machine Learning",
        url: "https://doi.org/10.1038/s41586-023/ml-intro",
        content: "Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data. These systems improve their performance on a specific task over time without being explicitly programmed. Machine learning algorithms use historical data as input to predict new output values. Supervised learning, unsupervised learning, and reinforcement learning are the three main types of machine learning. Deep learning is a specialized branch that uses neural networks with many layers to analyze various factors of data. The field has seen remarkable advances in recent years, particularly in areas such as image recognition, natural language processing, and autonomous vehicles."
      },
      {
        id: "cs-002",
        title: "Data Structures and Algorithms: A Comprehensive Review",
        url: "https://doi.org/10.1145/3544548/dsa-review",
        content: "Data structures are fundamental building blocks in computer science that organize and store data efficiently. Common data structures include arrays, linked lists, stacks, queues, trees, and graphs. Each data structure has its own strengths and weaknesses, making it suitable for different types of applications. Algorithms are step-by-step procedures for solving computational problems. The efficiency of an algorithm is typically measured using Big O notation, which describes how the running time grows relative to the input size. Understanding data structures and algorithms is essential for writing efficient and scalable software applications."
      },
      {
        id: "cs-003",
        title: "Advances in Quantum Computing and Information Theory",
        url: "https://doi.org/10.1038/s41586-024/quantum-comp",
        content: "Quantum computing represents a paradigm shift in computational technology, leveraging the principles of quantum mechanics to process information in fundamentally new ways. Unlike classical computers that use bits representing either zero or one, quantum computers use quantum bits or qubits, which can exist in a superposition of states simultaneously. This property enables quantum computers to explore multiple solutions to a problem at the same time, offering exponential speedups for certain classes of computations. Key applications include cryptography, drug discovery, optimization problems, and simulating complex molecular interactions. Major technology companies including IBM, Google, and Microsoft have invested heavily in quantum computing research."
      },
      {
        id: "cs-004",
        title: "The Evolution of Artificial Intelligence: From Expert Systems to Deep Learning",
        url: "https://doi.org/10.1145/3459788/ai-evolution",
        content: "Artificial intelligence has evolved significantly since its inception in the mid-twentieth century. Early AI systems relied on rule-based approaches and expert systems that encoded human knowledge in the form of if-then rules. The development of machine learning in the 1980s and 1990s shifted the focus towards statistical approaches that could learn patterns from data. The breakthrough in deep learning, catalyzed by the availability of large datasets and powerful computing hardware, has led to unprecedented performance in tasks such as image classification, speech recognition, and language translation. Modern large language models represent the cutting edge of artificial intelligence, demonstrating capabilities that were previously thought to require human-level intelligence."
      },
      {
        id: "cs-005",
        title: "Cybersecurity Threats and Defense Mechanisms in the Digital Age",
        url: "https://doi.org/10.1109/MSP.2023/cybersec-threats",
        content: "Cybersecurity has become one of the most critical concerns for organizations and individuals in the digital age. Common cyber threats include malware, phishing attacks, ransomware, social engineering, and distributed denial-of-service attacks. These threats can result in significant financial losses, data breaches, and damage to organizational reputation. Defense mechanisms include firewalls, intrusion detection systems, encryption, multi-factor authentication, and employee security awareness training. The field of cybersecurity is constantly evolving as attackers develop new techniques and defenders create more sophisticated countermeasures."
      },
      {
        id: "cs-006",
        title: "Cloud Computing Architecture: Models, Services, and Deployment Strategies",
        url: "https://doi.org/10.1145/3587645/cloud-arch",
        content: "Cloud computing has fundamentally transformed how organizations provision, manage, and scale their information technology infrastructure. The three primary service models—Infrastructure as a Service (IaaS), Platform as a Service (PaaS), and Software as a Service (SaaS)—provide varying levels of abstraction and control to consumers. Infrastructure as a Service allows organizations to rent virtual machines, storage, and networking components on demand, eliminating the need for upfront capital investment in physical hardware. Platform as a Service abstracts the underlying infrastructure and provides a managed runtime environment where developers can deploy applications without worrying about operating system maintenance or server configuration. Software as a Service delivers fully managed applications over the internet, accessible through web browsers on a subscription basis. Cloud deployment models include public, private, hybrid, and multi-cloud configurations, each offering distinct advantages in terms of cost, security, compliance, and scalability."
      },
      {
        id: "cs-007",
        title: "Blockchain Technology and Cryptocurrencies: Principles and Applications",
        url: "https://doi.org/10.1145/3491248/blockchain-crypto",
        content: "Blockchain technology represents a decentralized and distributed ledger system that records transactions across a network of computers in a tamper-resistant manner. Each block in the chain contains a cryptographic hash of the previous block, a timestamp, and transaction data, creating an immutable and transparent record of all activities. The consensus mechanisms used in blockchain networks, such as Proof of Work and Proof of Stake, ensure that all participants agree on the validity of transactions without requiring a central authority. Cryptocurrencies like Bitcoin and Ethereum are the most well-known applications of blockchain technology, enabling peer-to-peer digital payments and programmable smart contracts. Beyond finance, blockchain is being explored for supply chain management, healthcare record systems, digital identity verification, and decentralized governance structures."
      },
      {
        id: "cs-008",
        title: "Computer Vision and Image Recognition: From Pixels to Understanding",
        url: "https://doi.org/10.1109/TPAMI.2024/cv-recognition",
        content: "Computer vision is a field of artificial intelligence that enables machines to interpret and understand visual information from the world, including digital images and video sequences. The development of convolutional neural networks has revolutionized image recognition tasks, achieving superhuman performance on benchmark datasets such as ImageNet. Object detection algorithms like YOLO and Faster R-CNN can identify and localize multiple objects within a single image in real time. Semantic segmentation goes a step further by classifying each pixel in an image into predefined categories, enabling applications such as autonomous driving, medical image analysis, and satellite imagery interpretation. Recent advances in vision transformers and self-supervised learning have further expanded the capabilities of computer vision systems, allowing them to learn robust visual representations from large amounts of unlabeled image data."
      },
      {
        id: "cs-009",
        title: "Natural Language Processing Advances: Transformer Models and Beyond",
        url: "https://doi.org/10.1162/coli.2024/nlp-transformers",
        content: "Natural language processing has undergone a remarkable transformation with the introduction of transformer-based architectures. The self-attention mechanism, which allows models to weigh the importance of different words in a sentence simultaneously, has become the backbone of modern NLP systems. Pre-trained language models such as BERT, GPT, and T5 learn rich linguistic representations from massive text corpora and can be fine-tuned for downstream tasks including sentiment analysis, named entity recognition, question answering, and machine translation. The scaling of these models to billions of parameters has revealed emergent capabilities such as few-shot and zero-shot learning, where models can perform tasks they were not explicitly trained on. Recent research directions include multimodal models that combine text with images, retrieval-augmented generation for factual accuracy, and efficient model architectures that reduce computational costs while maintaining performance."
      },

      // ═══════════════════════════════════════════════════════
      // ── 2. MEDICINE & HEALTH (6 documents) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "med-001",
        title: "The Impact of COVID-19 on Global Public Health Systems",
        url: "https://doi.org/10.1056/NEJMoa2201234/covid19-impact",
        content: "The COVID-19 pandemic has had a profound and lasting impact on global public health systems. Healthcare infrastructure in many countries was overwhelmed by the surge in cases, exposing critical weaknesses in pandemic preparedness and response. The pandemic accelerated the adoption of telemedicine and digital health technologies, transforming how healthcare is delivered. Vaccine development achieved unprecedented speed with mRNA technology platforms demonstrating remarkable efficacy. Mental health consequences of the pandemic, including increased rates of anxiety, depression, and social isolation, continue to affect populations worldwide. Lessons learned from COVID-19 are reshaping public health policy and emergency response frameworks."
      },
      {
        id: "med-002",
        title: "Antibiotic Resistance: A Growing Global Health Crisis",
        url: "https://doi.org/10.1056/NEJMoa2205678/antibiotic-resist",
        content: "Antibiotic resistance has emerged as one of the most pressing global health challenges of the twenty-first century. The overuse and misuse of antibiotics in both human medicine and agriculture has accelerated the evolution of drug-resistant bacteria. Methicillin-resistant Staphylococcus aureus (MRSA) and multidrug-resistant tuberculosis are among the most dangerous resistant organisms. The World Health Organization has warned that without urgent action, we could enter a post-antibiotic era where common infections become untreatable. Strategies to combat antibiotic resistance include improved stewardship programs, development of new antimicrobial agents, and investment in alternative therapies such as phage therapy and immunotherapies."
      },
      {
        id: "med-003",
        title: "Mental Health Awareness and Treatment in Modern Society",
        url: "https://doi.org/10.1176/appi.ajp.2023/mental-health",
        content: "Mental health is an integral component of overall well-being, yet it has historically been stigmatized and underfunded compared to physical health. Depression, anxiety disorders, bipolar disorder, and schizophrenia are among the most prevalent mental health conditions globally. Early intervention and access to evidence-based treatments, including cognitive behavioral therapy and psychopharmacology, significantly improve outcomes. The integration of mental health services into primary care settings has shown promise in increasing access to treatment. Workplace mental health programs and school-based counseling services are essential components of a comprehensive public mental health strategy."
      },
      {
        id: "med-004",
        title: "Telemedicine and Digital Health: Transforming Healthcare Delivery",
        url: "https://doi.org/10.1056/NEJMoa2301234/telemedicine-digital",
        content: "Telemedicine and digital health technologies have fundamentally altered the landscape of healthcare delivery, enabling remote consultations, continuous health monitoring, and data-driven clinical decision-making. Video conferencing platforms, remote patient monitoring devices, and mobile health applications have made it possible for patients to access quality healthcare services from the comfort of their homes, reducing geographical barriers and improving convenience. The integration of artificial intelligence into diagnostic tools has enhanced the accuracy and speed of disease detection, particularly in radiology, pathology, and dermatology. Electronic health records and health information exchange systems facilitate seamless sharing of patient data across healthcare providers, improving care coordination and reducing medical errors. Despite these advances, challenges related to data privacy, regulatory compliance, digital literacy among elderly populations, and reimbursement policies continue to shape the adoption and sustainability of telemedicine services worldwide."
      },
      {
        id: "med-005",
        title: "Epidemiology and Disease Control: Principles and Practice",
        url: "https://doi.org/10.1093/aje/kwad012/epidemiology-disease",
        content: "Epidemiology is the study of how diseases distribute themselves in populations and the factors that influence this distribution. Disease surveillance systems form the backbone of public health response, enabling early detection of outbreaks, tracking of disease trends, and evaluation of intervention effectiveness. Mathematical modeling plays a crucial role in predicting the spread of infectious diseases and informing public health policies such as vaccination strategies, quarantine measures, and travel restrictions. The basic reproduction number, denoted R-naught, quantifies the transmissibility of an infectious agent and serves as a key parameter in outbreak response planning. Epidemiological study designs, including cohort studies, case-control studies, and randomized controlled trials, provide the evidence base for clinical and public health decision-making, while systematic reviews and meta-analyses synthesize findings across multiple studies to establish robust conclusions about disease etiology and treatment effectiveness."
      },
      {
        id: "med-006",
        title: "Pharmacology and Drug Development: From Bench to Bedside",
        url: "https://doi.org/10.1038/nrd.2024/pharmacology-drug",
        content: "Pharmacology encompasses the study of how drugs interact with biological systems to produce therapeutic effects. The drug development pipeline is a lengthy and costly process that typically spans ten to fifteen years from initial discovery to regulatory approval and market launch. Preclinical research involves in vitro studies and animal testing to evaluate drug safety, efficacy, and pharmacokinetic properties before advancing to human clinical trials. Clinical trials proceed through four phases, each with progressively larger sample sizes and more rigorous evaluation criteria, designed to establish the drug's safety profile, optimal dosing regimen, and comparative effectiveness against existing treatments. The advent of precision medicine and pharmacogenomics has ushered in a new era of targeted therapies, where drugs are designed to interact with specific molecular targets identified through genomic profiling of individual patients, maximizing therapeutic benefit while minimizing adverse effects."
      },

      // ═══════════════════════════════════════════════════════
      // ── 3. ENVIRONMENTAL SCIENCE (6 documents) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "env-001",
        title: "Climate Change and Global Warming: Causes, Effects, and Solutions",
        url: "https://doi.org/10.1038/s41558-024/climate-change",
        content: "Climate change refers to long-term shifts in global temperatures and weather patterns. While natural processes can cause climate variations, since the 1800s human activities have been the main driver of climate change, primarily due to the burning of fossil fuels like coal, oil, and gas. Global warming is the long-term heating of Earth's surface observed since the pre-industrial period due to human activities. The primary cause of global warming is the greenhouse effect, where certain gases in Earth's atmosphere trap heat. Carbon dioxide, methane, and nitrous oxide are the primary greenhouse gases. Rising sea levels, melting ice caps, and increasing frequency of extreme weather events are among the most visible consequences of climate change."
      },
      {
        id: "env-002",
        title: "Biodiversity Loss and Ecosystem Degradation",
        url: "https://doi.org/10.1126/science.abo1234/biodiversity-loss",
        content: "Biodiversity loss is occurring at an unprecedented rate, with scientists estimating that species are going extinct at rates hundreds of times higher than natural background levels. Habitat destruction, pollution, overexploitation, invasive species, and climate change are the primary drivers of biodiversity decline. Ecosystem degradation undermines the essential services that nature provides to humanity, including clean water, pollination, soil fertility, and climate regulation. Conservation strategies such as protected area networks, habitat restoration, and sustainable land management practices are critical for preserving biodiversity. International agreements like the Convention on Biological Diversity aim to coordinate global conservation efforts."
      },
      {
        id: "env-003",
        title: "Renewable Energy Transition and Sustainable Development",
        url: "https://doi.org/10.1038/s41560-024/renewable-transition",
        content: "The transition from fossil fuels to renewable energy sources is essential for achieving sustainable development and mitigating climate change. Solar, wind, hydroelectric, and geothermal energy have become increasingly cost-competitive with traditional fossil fuel sources. The International Energy Agency projects that renewable energy will account for the majority of global electricity generation by 2030. Energy storage technologies, particularly lithium-ion batteries, are critical for managing the intermittency of solar and wind power. Developing nations face unique challenges in the energy transition, requiring international cooperation and technology transfer to ensure equitable access to clean energy solutions."
      },
      {
        id: "env-004",
        title: "Water Pollution and Treatment Technologies: Current Challenges and Innovations",
        url: "https://doi.org/10.1016/j.watres.2024/water-pollution",
        content: "Water pollution remains one of the most critical environmental challenges facing the world today, affecting both surface water bodies and groundwater aquifers that serve as primary sources of drinking water for billions of people. Industrial effluents, agricultural runoff containing pesticides and fertilizers, untreated sewage discharge, and microplastic contamination are the major contributors to water quality degradation worldwide. Conventional water treatment processes, including coagulation, flocculation, sedimentation, filtration, and disinfection, have been the standard approach for producing potable water from raw sources for over a century. However, emerging contaminants such as pharmaceutical residues, endocrine-disrupting chemicals, and per- and polyfluoroalkyl substances require advanced treatment technologies including membrane filtration, advanced oxidation processes, activated carbon adsorption, and biological treatment systems. Nanotechnology-based water treatment methods, utilizing nanoparticles and nanofibrous membranes, show promising results in removing contaminants at the molecular level while maintaining high throughput and energy efficiency."
      },
      {
        id: "env-005",
        title: "Deforestation and Its Global Impact: Ecological Consequences and Policy Responses",
        url: "https://doi.org/10.1146/annurev.energy.2024/deforestation",
        content: "Deforestation, the large-scale removal of forest cover, has accelerated dramatically over the past several decades, with tropical rainforests experiencing the most severe losses. The Amazon basin, the Congo basin, and the forests of Southeast Asia have been particularly hard hit, losing millions of hectares of primary forest each year. The drivers of deforestation are complex and interrelated, including agricultural expansion for cattle ranching and soybean cultivation, commercial logging operations, mining activities, infrastructure development, and subsistence farming by local communities. The ecological consequences of deforestation extend far beyond the immediate loss of trees, encompassing biodiversity loss as habitat is destroyed, disruption of local and regional water cycles, increased soil erosion and sedimentation of waterways, and significant contributions to global greenhouse gas emissions through the release of stored carbon. International policy frameworks such as REDD-plus (Reducing Emissions from Deforestation and Forest Degradation) aim to create financial incentives for forest conservation by valuing the carbon storage and ecosystem services that forests provide."
      },
      {
        id: "env-006",
        title: "Ocean Acidification and Marine Ecosystems: A Growing Crisis",
        url: "https://doi.org/10.1038/s41558-024/ocean-acidification",
        content: "Ocean acidification, often referred to as the evil twin of climate change, occurs when the ocean absorbs excess carbon dioxide from the atmosphere, leading to a decrease in seawater pH. Since the beginning of the industrial revolution, the average pH of ocean surface waters has decreased by approximately zero point one units, representing a twenty-six percent increase in acidity. This seemingly small change has profound implications for marine organisms that build calcium carbonate shells and skeletons, including corals, mollusks, echinoderms, and certain species of plankton that form the foundation of marine food webs. Coral reef ecosystems, which support approximately twenty-five percent of all known marine species despite covering less than one percent of the ocean floor, are particularly vulnerable to acidification. Mass bleaching events, driven by rising ocean temperatures combined with acidification stress, have caused widespread coral mortality across tropical reef systems worldwide."
      },

      // ═══════════════════════════════════════════════════════
      // ── 4. SOCIAL SCIENCES (6 documents) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "soc-001",
        title: "The Impact of Social Media on Society and Democracy",
        url: "https://doi.org/10.1145/3491245/social-media-impact",
        content: "Social media has fundamentally transformed the way people communicate and interact with each other. Platforms like Facebook, Twitter, and Instagram have created new avenues for connection while also raising concerns about privacy, mental health, and the spread of misinformation. The rise of social media has democratized information sharing, allowing individuals to reach global audiences instantly. However, the algorithmic curation of content on these platforms has led to the formation of echo chambers, where users are primarily exposed to information that reinforces their existing beliefs. Studies have shown that excessive social media use can contribute to feelings of anxiety, depression, and loneliness, particularly among young people."
      },
      {
        id: "soc-002",
        title: "Globalization and Its Effects on Developing Economies",
        url: "https://doi.org/10.1093/wber/lhad003/globalization-dev",
        content: "Globalization has profoundly shaped economic development patterns across the world, creating both opportunities and challenges for developing nations. International trade liberalization has opened new markets for goods and services, contributing to economic growth in many developing countries. Foreign direct investment has brought capital, technology, and expertise to emerging economies, creating jobs and stimulating industrial development. However, globalization has also been associated with increased income inequality, environmental degradation, and the erosion of local cultural practices. The phenomenon of brain drain, where skilled professionals emigrate from developing to developed countries, further compounds the challenges faced by developing nations."
      },
      {
        id: "soc-003",
        title: "Gender Equality and Women's Empowerment in the 21st Century",
        url: "https://doi.org/10.1080/13545701.2023/gender-equality",
        content: "Gender equality remains a fundamental human rights challenge and a necessary foundation for a peaceful, prosperous, and sustainable world. Despite significant progress in recent decades, women continue to face discrimination in education, employment, political participation, and access to healthcare. The gender pay gap persists across all industries and regions, with women earning approximately seventy-seven cents for every dollar earned by men. Women's empowerment through education, economic opportunity, and political representation has been shown to drive economic growth and improve health outcomes for entire communities. Legislative reforms and corporate gender diversity initiatives are important tools for advancing gender equality."
      },
      {
        id: "soc-004",
        title: "Psychology of Learning and Memory: Cognitive Processes and Educational Implications",
        url: "https://doi.org/10.1037/edu0000567/learning-memory",
        content: "The psychology of learning and memory encompasses the cognitive processes through which individuals acquire, encode, store, and retrieve information over time. Information processing theory models human cognition as a sequence of stages through which sensory input is transformed into meaningful knowledge. Working memory, a limited-capacity system that temporarily holds and manipulates information during complex cognitive tasks, plays a central role in reasoning, comprehension, and learning. Long-term memory, in contrast, has an effectively unlimited capacity and stores information through elaborate encoding strategies such as semantic organization, visual imagery, and mnemonic devices. Retrieval practice, the act of actively recalling information from memory, has been identified as one of the most effective learning strategies, producing superior long-term retention compared to passive review techniques such as rereading or highlighting text. Spaced repetition, which distributes study sessions across increasing intervals, leverages the spacing effect to optimize memory consolidation and reduce the natural tendency toward forgetting over time."
      },
      {
        id: "soc-005",
        title: "Criminology and Criminal Justice Systems: Theory, Policy, and Practice",
        url: "https://doi.org/10.1111/1745-9133.2024/criminology-cjs",
        content: "Criminology is the interdisciplinary study of crime, criminal behavior, and the societal responses to criminal activity. Classical criminological theories, rooted in the Enlightenment ideals of rationality and free will, posit that individuals engage in criminal behavior after weighing the potential benefits against the expected costs of punishment. Positivist criminology, in contrast, emphasizes biological, psychological, and sociological determinants of criminal conduct, arguing that factors beyond individual choice influence propensity toward offending. The criminal justice system comprises three principal components: law enforcement agencies responsible for crime prevention and detection, courts that adjudicate criminal cases and determine guilt or innocence, and correctional institutions that administer sentences and facilitate rehabilitation. Contemporary debates in criminal justice policy center on issues such as mass incarceration, racial disparities in policing and sentencing, the effectiveness of rehabilitation versus punishment, restorative justice approaches that prioritize healing and community reconciliation, and the appropriate use of technology in surveillance and crime prevention."
      },
      {
        id: "soc-006",
        title: "Urbanization and Its Challenges in Africa: Growth, Infrastructure, and Sustainability",
        url: "https://doi.org/10.1080/01944363.2024/africa-urbanization",
        content: "Africa is experiencing the fastest rate of urbanization in the world, with its urban population projected to nearly triple by 2050 according to United Nations estimates. Cities such as Lagos, Nairobi, Kinshasa, and Addis Ababa are expanding rapidly as millions of rural migrants seek economic opportunities, better access to education and healthcare, and improved living standards. However, this rapid urban growth has outpaced the development of essential infrastructure, including housing, transportation networks, water supply systems, and sanitation facilities. Informal settlements, commonly known as slums, house a significant proportion of urban residents in many African cities, characterized by inadequate shelter, overcrowding, and limited access to basic services. Urban planning in Africa must address the dual challenge of managing rapid population growth while promoting sustainable and inclusive development that benefits all residents regardless of socioeconomic status. Innovative approaches such as transit-oriented development, mixed-use zoning, public-private partnerships for infrastructure investment, and community-led upgrading programs are being explored as strategies to create more livable and resilient African cities."
      },

      // ═══════════════════════════════════════════════════════
      // ── 5. BUSINESS & ECONOMICS (6 documents) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "biz-001",
        title: "Digital Transformation in Modern Business",
        url: "https://doi.org/10.1057/s41263-023/digital-transform",
        content: "Digital transformation refers to the integration of digital technology into all areas of a business, fundamentally changing how organizations operate and deliver value to customers. Cloud computing, artificial intelligence, big data analytics, and the Internet of Things are key technologies driving digital transformation across industries. Companies that successfully embrace digital transformation gain competitive advantages through improved operational efficiency, enhanced customer experiences, and the ability to develop innovative new business models. However, digital transformation initiatives often face significant challenges, including organizational resistance to change, legacy system integration, cybersecurity concerns, and the need for workforce upskilling."
      },
      {
        id: "biz-002",
        title: "Entrepreneurship and Innovation in the African Context",
        url: "https://doi.org/10.1093/wber/lhad012/african-entrepreneurship",
        content: "Entrepreneurship has emerged as a powerful engine of economic growth and innovation across the African continent. Africa's young and rapidly growing population presents both a demographic dividend and a challenge for job creation. The mobile technology revolution has created new opportunities for African entrepreneurs to develop innovative solutions tailored to local needs. Fintech startups have been particularly successful, leveraging mobile money platforms to provide financial services to previously unbanked populations. Despite these successes, African entrepreneurs continue to face significant barriers including limited access to capital, inadequate infrastructure, regulatory hurdles, and political instability in some regions."
      },
      {
        id: "biz-003",
        title: "Supply Chain Management and Logistics: Strategies for Resilient Operations",
        url: "https://doi.org/10.1080/00207543.2024/supply-chain-mgmt",
        content: "Supply chain management encompasses the planning, coordination, and control of all activities involved in the flow of goods, information, and finances from raw material suppliers through manufacturing and distribution to the final consumer. Effective supply chain management is critical for organizations seeking to reduce costs, improve customer satisfaction, and gain competitive advantage in an increasingly globalized marketplace. The bullwhip effect, a phenomenon where small fluctuations in consumer demand cause progressively larger oscillations in orders placed upstream, remains a persistent challenge that inventory optimization and demand forecasting techniques aim to mitigate. Lean supply chain practices, inspired by the Toyota Production System, focus on eliminating waste and improving efficiency through just-in-time delivery, continuous improvement, and close collaboration with suppliers. The COVID-19 pandemic exposed vulnerabilities in global supply networks, prompting organizations to adopt resilience strategies including supply base diversification, nearshoring, digital supply chain twins, and advanced analytics for real-time visibility and risk management."
      },
      {
        id: "biz-004",
        title: "Corporate Social Responsibility: Theory, Practice, and Impact Assessment",
        url: "https://doi.org/10.1057/s41267-023/corporate-social-resp",
        content: "Corporate social responsibility represents a business model in which companies integrate social and environmental concerns into their operations and stakeholder interactions on a voluntary basis. The concept has evolved significantly from its origins in philanthropic giving to encompass a comprehensive framework that addresses the triple bottom line of economic, social, and environmental performance. Stakeholder theory argues that businesses have obligations to all parties affected by their activities, including employees, customers, suppliers, communities, and the natural environment, not solely to shareholders seeking financial returns. Environmental, Social, and Governance reporting has become a standard practice among publicly traded companies, providing investors and consumers with transparent information about corporate sustainability practices and ethical standards. Empirical research on the relationship between corporate social responsibility and financial performance has yielded mixed results, though meta-analyses suggest a modest positive correlation between strong social and environmental performance and long-term financial success."
      },
      {
        id: "biz-005",
        title: "Microfinance and Economic Development in Africa: Opportunities and Limitations",
        url: "https://doi.org/10.1093/wber/lhad034/microfinance-africa",
        content: "Microfinance, the provision of small-scale financial services to low-income individuals and communities without access to traditional banking, has been widely promoted as a tool for poverty alleviation and economic development in Africa. Microcredit programs, pioneered by institutions such as the Grameen Bank in Bangladesh, provide small loans to entrepreneurs, predominantly women, to start or expand small businesses. The microfinance model has expanded across the African continent, with thousands of microfinance institutions, savings and credit cooperatives, and mobile money platforms serving millions of previously unbanked or underbanked individuals. Studies on the impact of microfinance on poverty reduction have produced varied findings, with some research demonstrating positive effects on household income, business creation, and women's empowerment, while other studies have found limited or negligible impacts, particularly in contexts where structural barriers to economic advancement persist. Over-indebtedness among borrowers, high interest rates charged by some microfinance institutions, and inadequate regulation of the microfinance sector represent significant challenges that policymakers and practitioners must address."
      },

      // ═══════════════════════════════════════════════════════
      // ── 6. EDUCATION (6 documents) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "edu-001",
        title: "Online Learning and Educational Technology Trends",
        url: "https://doi.org/10.1145/3448139/online-learning-edtech",
        content: "Online learning has experienced explosive growth, accelerated by the COVID-19 pandemic and advances in educational technology. Learning management systems, video conferencing platforms, and interactive educational tools have made remote education more accessible than ever before. Massive Open Online Courses (MOOCs) have democratized access to high-quality educational content from prestigious institutions worldwide. However, the shift to online learning has highlighted significant disparities in digital access and technological literacy across different socioeconomic groups. Blended learning approaches that combine online and in-person instruction have shown promise in optimizing learning outcomes while maintaining flexibility for diverse learner needs."
      },
      {
        id: "edu-002",
        title: "Academic Integrity in Higher Education: Challenges and Solutions",
        url: "https://doi.org/10.1007/s10734-023/academic-integrity",
        content: "Academic integrity is a cornerstone of higher education, ensuring that degrees and qualifications accurately reflect genuine learning and achievement. Plagiarism, contract cheating, and unauthorized collaboration represent serious threats to academic integrity in universities worldwide. The rise of artificial intelligence tools capable of generating human-like text has created new challenges for educators in detecting and preventing academic dishonesty. Institutions are responding through a combination of technology-based detection tools, honor codes, educational programs that teach proper citation practices, and assessment redesign that emphasizes authentic learning demonstrations. Building a culture of integrity requires collaboration between faculty, students, and administrators."
      },
      {
        id: "edu-003",
        title: "Special Education and Inclusive Learning: Approaches and Best Practices",
        url: "https://doi.org/10.1177/0014402923/special-ed-inclusive",
        content: "Special education is a specialized instructional approach designed to meet the unique learning needs of students with disabilities, developmental delays, and exceptional learning differences. Inclusive education, as defined by the UNESCO Salamanca Statement, advocates for the placement of students with special needs in general education classrooms with appropriate supports and accommodations, rather than segregating them into separate educational settings. The Individuals with Disabilities Education Act mandates that public schools provide free and appropriate public education to all eligible children with disabilities in the least restrictive environment possible. Individualized Education Programs serve as the cornerstone of special education service delivery, outlining specific learning goals, accommodations, modifications, and support services tailored to each student's unique needs. Assistive technology, ranging from screen readers and speech-to-text software to adaptive keyboards and communication devices, has revolutionized access to the curriculum for students with physical, sensory, and learning disabilities, enabling greater independence and participation in educational activities."
      },
      {
        id: "edu-004",
        title: "Educational Leadership and Administration: Theory and Practice",
        url: "https://doi.org/10.1080/0013191X.2024/ed-leadership",
        content: "Educational leadership encompasses the vision, direction, and management practices that guide schools, colleges, and educational systems toward achieving their stated goals and objectives. Effective school leadership has been consistently identified as one of the most significant school-level factors influencing student achievement, second only to classroom instruction in terms of its impact on learning outcomes. Transformational leadership theory, which emphasizes the importance of inspiring followers toward a shared vision, fostering intellectual stimulation, and providing individualized support, has been widely applied in educational settings. Distributed leadership models recognize that leadership is not solely the province of formal administrators but rather a shared responsibility that emerges through collaborative interactions among teachers, staff, and community stakeholders. Educational administrators face a complex array of responsibilities including budget management, curriculum development, personnel supervision, community relations, policy implementation, and crisis management, requiring a diverse skill set that blends instructional knowledge with organizational management expertise."
      },
      {
        id: "edu-005",
        title: "STEM Education and Innovation: Preparing Students for the Future",
        url: "https://doi.org/10.1002/tea.21789/stem-education",
        content: "STEM education, an interdisciplinary approach to learning that integrates science, technology, engineering, and mathematics, has become a national priority for countries seeking to maintain competitiveness in the global knowledge economy. The emphasis on STEM education reflects the growing demand for workers with strong analytical, problem-solving, and technical skills in fields ranging from artificial intelligence and biotechnology to renewable energy and advanced manufacturing. Project-based learning, inquiry-based instruction, and hands-on laboratory experiences are pedagogical approaches that have been shown to enhance student engagement and deepen conceptual understanding in STEM subjects. The persistent underrepresentation of women, racial and ethnic minorities, and students from low-income backgrounds in STEM fields represents a significant equity challenge that educators and policymakers are working to address through targeted outreach programs, mentorship initiatives, curriculum reforms that emphasize culturally relevant connections, and efforts to dismantle stereotype threats that discourage diverse participation in science and engineering careers."
      },

      // ═══════════════════════════════════════════════════════
      // ── 7. ENGINEERING (6 documents) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "eng-001",
        title: "Sustainable Engineering and Green Building Design",
        url: "https://doi.org/10.1061/(ASCE)0733-9402/sustainable-eng",
        content: "Sustainable engineering aims to design and operate systems that use energy and resources sustainably while minimizing environmental impact. Green building design incorporates energy-efficient materials, renewable energy systems, water conservation features, and indoor environmental quality improvements. Leadership in Energy and Environmental Design (LEED) certification provides a widely recognized framework for evaluating building sustainability. Life cycle assessment methodology enables engineers to evaluate the total environmental impact of products and processes from raw material extraction through disposal. The circular economy concept, which emphasizes designing for reuse, recycling, and resource recovery, is transforming traditional engineering approaches."
      },
      {
        id: "eng-002",
        title: "The Internet of Things: Connecting the Physical and Digital Worlds",
        url: "https://doi.org/10.1109/JIOT.2024/iot-connected",
        content: "The Internet of Things (IoT) refers to the network of physical devices embedded with sensors, software, and connectivity that enables them to collect and exchange data. Smart home devices, wearable fitness trackers, industrial monitoring systems, and connected vehicles are all examples of IoT applications that are transforming daily life and industrial processes. The proliferation of IoT devices generates enormous volumes of data, creating both opportunities for data-driven decision making and challenges for data management and privacy protection. Edge computing, which processes data closer to where it is generated, is emerging as a key architectural pattern for managing IoT workloads efficiently."
      },
      {
        id: "eng-003",
        title: "Robotics and Automation in Manufacturing: Industry 4.0 and Smart Factories",
        url: "https://doi.org/10.1109/TMECH.2024/robotics-manufacturing",
        content: "Robotics and automation have revolutionized manufacturing processes, driving the transition toward Industry 4.0 and the smart factory paradigm. Industrial robots, equipped with advanced sensors, machine vision systems, and artificial intelligence algorithms, can perform complex tasks with precision, speed, and consistency that surpass human capabilities in many applications. Collaborative robots, or cobots, are designed to work alongside human operators in shared workspaces, combining the strength and endurance of machines with the cognitive flexibility and dexterity of human workers. Additive manufacturing, commonly known as three-dimensional printing, has emerged as a complementary technology that enables rapid prototyping, customization, and distributed production of complex geometries that would be difficult or impossible to create using traditional subtractive manufacturing methods. Digital twin technology, which creates virtual replicas of physical manufacturing systems, allows engineers to simulate, optimize, and predict the performance of production processes before implementing changes in the real world."
      },
      {
        id: "eng-004",
        title: "Renewable Energy Systems Design: Solar, Wind, and Hybrid Power Solutions",
        url: "https://doi.org/10.1109/TSTE.2024/renewable-design",
        content: "Renewable energy systems design encompasses the engineering principles and methodologies required to develop efficient, reliable, and cost-effective power generation systems based on sustainable energy sources. Photovoltaic systems convert sunlight directly into electricity using semiconductor materials, with monocrystalline and polycrystalline silicon panels representing the dominant technology in the commercial market. Wind energy conversion systems harness the kinetic energy of moving air through horizontal-axis or vertical-axis turbines, with offshore wind farms offering higher and more consistent wind speeds compared to onshore installations. Hybrid renewable energy systems, which combine multiple energy generation technologies such as solar photovoltaic arrays, wind turbines, and battery energy storage systems, provide improved reliability and power quality by compensating for the inherent variability and intermittency of individual renewable sources. Power electronics, including inverters, converters, and maximum power point tracking controllers, are essential components that manage the interface between renewable energy generators and the electrical grid."
      },
      {
        id: "eng-005",
        title: "Structural Engineering and Earthquake Resilience: Design Principles and Innovations",
        url: "https://doi.org/10.1061/(ASCE)ST.2024/structural-eq",
        content: "Structural engineering for earthquake resilience focuses on designing buildings, bridges, and infrastructure systems that can withstand seismic forces and maintain their functionality during and after earthquake events. Performance-based earthquake engineering represents a paradigm shift from traditional prescriptive design codes, allowing engineers to design structures for specific performance objectives such as immediate occupancy, life safety, or collapse prevention at defined seismic hazard levels. Base isolation systems, which decouple the superstructure from the ground using flexible bearings or sliding interfaces, can dramatically reduce the transmission of seismic forces to the building above. Energy dissipation devices, including viscous dampers, friction dampers, and yielding metallic dampers, absorb and dissipate seismic energy, reducing structural demands and preventing damage to primary structural elements. Advanced materials such as fiber-reinforced polymers, high-performance concrete, and shape-memory alloys are increasingly being used to enhance the strength, ductility, and durability of structures in seismically active regions."
      },

      // ═══════════════════════════════════════════════════════
      // ── 8. HISTORY & CULTURE (5 documents) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "hist-001",
        title: "The History of the Internet and the World Wide Web",
        url: "https://doi.org/10.1109/5.771073/internet-history",
        content: "The Internet originated from ARPANET, a project funded by the United States Department of Defense in the late 1960s. The initial goal was to create a decentralized communication network that could withstand a nuclear attack. In 1989, Tim Berners-Lee invented the World Wide Web, which revolutionized how information was shared and accessed over the Internet. The introduction of web browsers in the early 1990s made the Internet accessible to the general public, leading to explosive growth in users and content. E-commerce, social networking, cloud computing, and mobile connectivity have all emerged as transformative applications built upon the Internet's infrastructure. Today, over five billion people worldwide have Internet access."
      },
      {
        id: "hist-002",
        title: "Nigerian History: From Independence to the Modern Era",
        url: "https://doi.org/10.1017/S0021853700123/nigerian-history",
        content: "Nigeria gained independence from British colonial rule on October 1, 1960, becoming the most populous country in Africa. The early post-independence period was marked by political instability, including a civil war from 1967 to 1970 that resulted in tremendous loss of life and displacement. The discovery and exploitation of oil reserves in the Niger Delta region transformed Nigeria's economy but also created challenges related to resource management, environmental degradation, and equitable distribution of wealth. Nigeria has played a significant role in regional and international affairs, contributing troops to peacekeeping missions and serving as a leader in the African Union and Economic Community of West African States."
      },
      {
        id: "hist-003",
        title: "The Scramble for Africa and Its Enduring Colonial Legacy",
        url: "https://doi.org/10.1017/S001041752400012/scramble-africa",
        content: "The Scramble for Africa, spanning roughly from 1881 to 1914, was a period of intense colonial expansion during which European powers rapidly partitioned and conquered nearly the entire African continent. The Berlin Conference of 1884 to 1885, convened by German Chancellor Otto von Bismarck, established the ground rules for the partition of Africa among European nations without any African representation. By the outbreak of the First World War, approximately ninety percent of the African continent was under European colonial control, with Britain, France, Germany, Belgium, Portugal, Italy, and Spain each claiming vast territories. The colonial legacy has had profound and lasting effects on African nations, including the imposition of arbitrary national borders that divided ethnic groups and communities, the extraction of natural resources for the benefit of colonial powers, the introduction of administrative and legal systems modeled on European institutions, and the disruption of pre-colonial political, economic, and social structures. Post-colonial African states have grappled with the enduring consequences of colonialism, including ethnic conflicts rooted in artificial borders, economic dependency patterns established during the colonial period, and cultural identity tensions between indigenous traditions and imported colonial values."
      },
      {
        id: "hist-004",
        title: "African Literature and Cultural Identity: Voices Across the Continent",
        url: "https://doi.org/10.1080/1369801X.2024/african-literature",
        content: "African literature encompasses a rich and diverse body of creative works produced by writers from across the African continent and the diaspora, reflecting the complexity of African cultural identities and historical experiences. The emergence of modern African literature in English, French, Portuguese, and indigenous African languages during the mid-twentieth century coincided with the wave of decolonization that swept across the continent, with writers such as Chinua Achebe, Wole Soyinka, Ngugi wa Thiong'o, and Ama Ata Aidoo using fiction, drama, and poetry to explore themes of cultural conflict, colonial encounter, and postcolonial identity formation. Oral traditions, including epic narratives, folktales, proverbs, and praise poetry, form a vital foundation of African literary heritage, providing a continuous link between contemporary written literature and centuries-old cultural expression. The Negritude movement, pioneered by African and Caribbean intellectuals including Leopold Sedar Senghor and Aime Cesaire, celebrated African cultural values, aesthetics, and philosophical worldviews as a counter-narrative to colonial stereotypes and European cultural supremacy. Contemporary African literature continues to evolve through genres such as speculative fiction, crime fiction, and graphic novels, with writers like Chimamanda Ngozi Adichie, Teju Cole, and Nnedi Okorafor achieving international recognition while engaging with themes of globalization, migration, technology, and social justice."
      },
      {
        id: "hist-005",
        title: "Pan-Africanism and African Unity Movements: History, Ideology, and Achievements",
        url: "https://doi.org/10.1080/0305707024/pan-africanism-unity",
        content: "Pan-Africanism is a political and cultural movement that advocates for the solidarity, unity, and liberation of African peoples both on the continent and throughout the diaspora. The movement traces its intellectual origins to the late nineteenth and early twentieth centuries, when thinkers such as Edward Wilmot Blyden, Henry Sylvester-Williams, and W.E.B. Du Bois began articulating a shared African identity that transcended the artificial boundaries imposed by colonialism and the transatlantic slave trade. The five Pan-African Congresses held between 1919 and 1945 provided platforms for African and diaspora intellectuals to coordinate strategies against colonialism and racial discrimination. The founding of the Organization of African Unity in 1963, with its headquarters in Addis Ababa, Ethiopia, represented a significant institutional achievement of the Pan-African movement, establishing a framework for continental cooperation on political, economic, and security matters. The successor organization, the African Union, established in 2002, expanded the scope of continental cooperation to include democratic governance, human rights, economic integration, and peace and security, reflecting the evolving priorities of African nations in the twenty-first century."
      },

      // ═══════════════════════════════════════════════════════
      // ── 9. LAW & POLITICS (3 documents — NEW) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "law-001",
        title: "Constitutional Law and Human Rights: Foundations of Democratic Governance",
        url: "https://doi.org/10.1093/icon/2024/constitutional-hr",
        content: "Constitutional law forms the supreme legal framework of a state, establishing the structure of government, defining the powers and limitations of public authorities, and guaranteeing fundamental rights and freedoms to citizens. Constitutional supremacy means that all ordinary legislation and executive actions must conform to the provisions of the constitution, with constitutional courts or supreme courts serving as arbiters of constitutional compliance. The entrenchment of a bill of rights within a constitution provides a justiciable framework for the protection of civil liberties including freedom of expression, freedom of assembly, freedom of religion, the right to due process, and the right to equality before the law. International human rights law, codified in instruments such as the Universal Declaration of Human Rights, the International Covenant on Civil and Political Rights, and the African Charter on Human and Peoples' Rights, establishes normative standards that complement and inform domestic constitutional protections. Constitutional design choices, including the selection between presidential and parliamentary systems of government, federal versus unitary structures of power distribution, and proportional versus majoritarian electoral systems, profoundly influence the quality of democratic governance and the protection of individual rights within a nation."
      },
      {
        id: "law-002",
        title: "International Relations and Diplomacy: Power, Institutions, and Global Governance",
        url: "https://doi.org/10.1093/ia/2024/international-relations",
        content: "International relations is the study of interactions between sovereign states, international organizations, non-state actors, and transnational forces in the global arena. The international system is characterized by the absence of a central governing authority, a condition referred to as anarchy in realist political theory, which shapes the behavior of states as they pursue their national interests in a competitive and often conflictual environment. Liberal institutionalist theory argues that international organizations, multilateral treaties, and diplomatic norms can mitigate the effects of anarchy by facilitating cooperation, reducing transaction costs, and establishing mechanisms for peaceful conflict resolution among states. The United Nations system, including the General Assembly, Security Council, International Court of Justice, and specialized agencies, represents the most ambitious attempt to create a comprehensive framework for global governance, collective security, and international law. Soft power, defined as the ability to influence others through attraction rather than coercion, has become an increasingly important dimension of statecraft in the twenty-first century, with countries investing in public diplomacy, cultural exchange programs, educational scholarships, and international development assistance to enhance their global influence and reputation."
      },
      {
        id: "law-003",
        title: "Electoral Systems and Democratic Governance: Design, Reform, and Impact",
        url: "https://doi.org/10.1017/S000712342400012/electoral-systems",
        content: "Electoral systems are the rules and procedures that determine how votes are cast, counted, and translated into political representation within a democracy. The choice of electoral system has profound consequences for the structure of party competition, the proportionality of representation, the accountability of elected officials, and the overall stability and legitimacy of democratic government. Majoritarian or plurality systems, such as the first-past-the-post system used in the United Kingdom and the United States, tend to produce single-party governments and clear accountability links between voters and their representatives, but often result in disproportionality where the share of seats won by parties does not accurately reflect their share of the popular vote. Proportional representation systems, including party-list proportional representation and the single transferable vote, aim to ensure that the composition of the legislature reflects the distribution of voter preferences more accurately, promoting the inclusion of diverse political perspectives and minority groups. Electoral reform movements around the world advocate for changes to existing voting systems to address perceived deficiencies in representation, reduce political polarization, enhance voter engagement, and strengthen public confidence in democratic institutions."
      },

      // ═══════════════════════════════════════════════════════
      // ── 10. AGRICULTURE (3 documents — NEW) ──
      // ═══════════════════════════════════════════════════════
      {
        id: "agr-001",
        title: "Agricultural Extension Services: Bridging the Gap Between Research and Practice",
        url: "https://doi.org/10.1017/S001447970012/agric-extension",
        content: "Agricultural extension services play a critical role in bridging the gap between agricultural research institutions and farming communities by facilitating the transfer of knowledge, technologies, and best practices to farmers. Extension services encompass a wide range of activities including on-farm demonstrations, training workshops, farmer field schools, advisory consultations, and the dissemination of information through radio programs, mobile messaging services, and printed materials. The effectiveness of extension services depends on the quality of extension agents, the relevance of the information provided to local farming conditions, the accessibility of services to smallholder farmers in remote areas, and the capacity of extension systems to incorporate farmer feedback into research and policy agendas. Participatory extension approaches, which involve farmers as active partners in the identification of problems, testing of solutions, and evaluation of outcomes, have been shown to achieve higher adoption rates of improved practices compared to traditional top-down technology transfer models. Digital extension services, leveraging mobile phones, social media platforms, and agricultural information portals, are expanding the reach and reducing the cost of extension delivery, particularly in regions where the ratio of extension agents to farmers is extremely low."
      },
      {
        id: "agr-002",
        title: "Climate-Smart Agriculture Practices: Adapting to a Changing Climate",
        url: "https://doi.org/10.1016/j.agsy.2024/climate-smart-agri",
        content: "Climate-smart agriculture is an integrated approach to managing agricultural systems that aims to achieve three interconnected objectives: sustainably increasing agricultural productivity and incomes, adapting and building resilience to climate change, and reducing or removing greenhouse gas emissions where possible. Conservation agriculture, which emphasizes minimum soil disturbance, permanent soil cover through mulching or cover crops, and crop diversification through rotations and intercropping, represents a foundational set of climate-smart practices that improve soil health, conserve water, and enhance carbon sequestration in agricultural landscapes. Improved water management techniques, including drip irrigation, rainwater harvesting, supplementary irrigation, and deficit irrigation scheduling, enable farmers to maintain crop yields under increasingly variable and unpredictable rainfall patterns associated with climate change. Climate-resilient crop varieties, developed through conventional breeding and modern biotechnology, offer traits such as drought tolerance, heat tolerance, flood tolerance, and resistance to emerging pests and diseases that are projected to intensify under future climate scenarios. Integrated pest management strategies that combine biological control, cultural practices, resistant varieties, and judicious use of chemical pesticides help farmers protect their crops while reducing the environmental impact of agricultural pest control."
      },
      {
        id: "agr-003",
        title: "Food Security and Nutrition in Sub-Saharan Africa: Challenges and Pathways Forward",
        url: "https://doi.org/10.1016/j.gfs.2024/food-security-africa",
        content: "Food security exists when all people, at all times, have physical and economic access to sufficient, safe, and nutritious food that meets their dietary needs and food preferences for an active and healthy life. Sub-Saharan Africa remains the region most severely affected by food insecurity and malnutrition, with approximately one in four people experiencing moderate to severe food insecurity according to recent assessments by the Food and Agriculture Organization. The root causes of food insecurity in the region are multifaceted and interconnected, encompassing low agricultural productivity due to limited use of improved inputs and technologies, environmental degradation including soil erosion and desertification, population growth that outpaces agricultural production gains, conflict and political instability that disrupt food systems, inadequate infrastructure for food storage and transportation, and climate variability that threatens rain-fed agriculture. Nutrition security goes beyond caloric adequacy to encompass access to a diverse diet that provides all essential macronutrients and micronutrients, with micronutrient deficiencies such as iron, zinc, vitamin A, and iodine deficiency remaining widespread, contributing to stunted growth, cognitive impairment, and increased susceptibility to disease among children and pregnant women."
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
        sourceType: doc.url.includes('doi.org') ? 'publication' as const : 'internet' as const,
      }));
      this.indexFingerprints(entries);
    }

    // ── Student Papers Corpus (15 papers) ──
    const studentPapers: { id: string; title: string; content: string }[] = [
      {
        id: "student-001",
        title: "The Impact of Artificial Intelligence on Modern Society",
        content: "Artificial intelligence has rapidly transformed modern society in ways that were previously unimaginable. From healthcare to transportation, education to entertainment, AI systems are now embedded in virtually every aspect of daily life. Machine learning algorithms power recommendation engines on streaming platforms, natural language processing enables virtual assistants to understand and respond to human speech, and computer vision technology allows autonomous vehicles to navigate complex road environments. The impact of artificial intelligence extends beyond convenience and efficiency, raising fundamental questions about employment, privacy, and the nature of human creativity. As AI continues to evolve, society must grapple with the ethical implications of delegating increasingly complex decisions to machines, from criminal sentencing algorithms to medical diagnosis systems.",
      },
      {
        id: "student-002",
        title: "Climate Change Solutions for Developing Nations",
        content: "Climate change poses an existential threat to developing nations that have contributed the least to global greenhouse gas emissions. These countries face a disproportionate burden from rising temperatures, changing precipitation patterns, and increasing frequency of extreme weather events. Solutions for developing nations must be tailored to their unique socioeconomic circumstances and resource constraints. Renewable energy technologies such as solar photovoltaic panels and small-scale wind turbines offer viable alternatives to fossil fuel dependence. Climate adaptation strategies including drought-resistant crop varieties, improved water management systems, and early warning systems for natural disasters are essential for building resilience. International climate finance mechanisms and technology transfer programs play a critical role in enabling developing nations to transition to sustainable development pathways while addressing immediate adaptation needs.",
      },
      {
        id: "student-003",
        title: "Mental Health Stigma in African Communities",
        content: "Mental health stigma remains one of the most significant barriers to accessing mental healthcare in African communities. Cultural beliefs, religious interpretations, and limited mental health literacy contribute to widespread misunderstanding of mental health conditions. Many individuals experiencing depression, anxiety, or other mental health disorders face discrimination and social exclusion rather than receiving compassionate care and support. Traditional healing practices, while culturally significant, may delay or prevent individuals from seeking evidence-based psychiatric treatment. The shortage of trained mental health professionals across the African continent further exacerbates the treatment gap, with some countries having fewer than one psychiatrist per million people. Community-based mental health education programs that integrate cultural sensitivity with scientific evidence offer promising approaches to reducing stigma and improving mental health outcomes in African populations.",
      },
      {
        id: "student-004",
        title: "The Role of Blockchain in Financial Inclusion",
        content: "Blockchain technology has emerged as a powerful tool for promoting financial inclusion among underserved populations worldwide. Decentralized finance platforms built on blockchain networks enable individuals without access to traditional banking services to participate in financial activities including lending, borrowing, saving, and investing. In regions where banking infrastructure is limited or unreliable, blockchain-based mobile payment solutions provide secure and efficient transaction capabilities. Smart contracts automate financial agreements without the need for intermediaries, reducing transaction costs and increasing the speed of financial operations. Digital identity verification systems built on blockchain technology allow previously undocumented individuals to establish verifiable identity credentials, opening access to a range of financial services. Despite these promising applications, challenges related to regulatory uncertainty, technological literacy, and network connectivity must be addressed to realize the full potential of blockchain for financial inclusion.",
      },
      {
        id: "student-005",
        title: "Cybersecurity Challenges in the Age of Remote Work",
        content: "The rapid shift to remote work has created unprecedented cybersecurity challenges for organizations of all sizes. With employees accessing corporate networks from personal devices and home internet connections, the traditional security perimeter has dissolved, requiring organizations to adopt zero-trust security architectures. Phishing attacks targeting remote workers have increased dramatically, exploiting the reduced security awareness and increased reliance on digital communication channels. Endpoint security has become critical as laptops, tablets, and smartphones outside the corporate network represent vulnerable targets for cybercriminals. Virtual private networks, multi-factor authentication, and endpoint detection and response solutions form the foundation of remote work security strategies. Organizations must also address the human factor through comprehensive cybersecurity awareness training programs that educate remote employees about emerging threats and best practices for maintaining security in distributed work environments.",
      },
      {
        id: "student-006",
        title: "Sustainable Urban Development in Sub-Saharan Africa",
        content: "Sub-Saharan Africa is experiencing the most rapid urbanization in the world, with urban populations projected to double by 2050. Sustainable urban development in this region requires innovative approaches that address the interconnected challenges of housing, transportation, water supply, sanitation, and energy access. Informal settlements that house millions of urban residents must be upgraded through participatory planning processes that involve communities in designing solutions tailored to their specific needs. Transit-oriented development that integrates affordable housing with public transportation infrastructure offers a model for creating livable and connected cities. Green building technologies and renewable energy systems can reduce the environmental footprint of urban expansion while improving quality of life for residents. Decentralized governance structures that empower local communities to participate in urban planning decisions are essential for ensuring that development is both sustainable and equitable.",
      },
      {
        id: "student-007",
        title: "The Ethics of Artificial Intelligence in Healthcare",
        content: "The integration of artificial intelligence into healthcare delivery raises profound ethical questions that must be carefully addressed to ensure equitable and just outcomes. AI-powered diagnostic systems have demonstrated remarkable accuracy in detecting diseases from medical imaging, pathology slides, and patient records, sometimes surpassing the performance of human specialists. However, these systems are only as reliable as the data on which they are trained, and biased training datasets can perpetuate or amplify existing healthcare disparities along racial, socioeconomic, and geographic lines. The opacity of many machine learning models creates challenges for informed consent, as patients may not understand how AI systems contribute to their diagnosis or treatment recommendations. Questions of accountability arise when AI systems make errors, particularly in high-stakes medical decisions. A robust ethical framework for AI in healthcare must prioritize transparency, fairness, accountability, and the preservation of human oversight in clinical decision-making.",
      },
      {
        id: "student-008",
        title: "E-Learning Effectiveness in Nigerian Higher Education",
        content: "The effectiveness of e-learning in Nigerian higher education institutions has become a topic of increasing importance following the disruptions caused by the COVID-19 pandemic. While e-learning platforms offer significant potential for expanding access to quality education, their implementation in Nigeria faces substantial challenges including inadequate internet infrastructure, unreliable electricity supply, and limited digital literacy among both students and faculty members. Learning management systems such as Moodle and Canvas have been adopted by many Nigerian universities, but the quality of online instruction varies widely depending on the level of faculty training and institutional support. Studies comparing student performance in online versus traditional classroom settings have produced mixed results, suggesting that the effectiveness of e-learning depends heavily on instructional design, learner engagement strategies, and the availability of interactive learning resources. Hybrid models that combine online and face-to-face instruction may offer the most promising approach for Nigerian higher education institutions seeking to leverage the benefits of digital learning while maintaining the interpersonal connections that are central to effective education.",
      },
      {
        id: "student-009",
        title: "Digital Divide and Educational Inequality",
        content: "The digital divide represents one of the most significant barriers to educational equity in the twenty-first century. Students from low-income families, rural communities, and developing countries often lack access to the digital devices, reliable internet connectivity, and technical support necessary to participate fully in digital learning environments. This digital exclusion exacerbates existing educational inequalities, creating a cycle of disadvantage that limits opportunities for social mobility and economic advancement. The COVID-19 pandemic dramatically highlighted these disparities as schools worldwide transitioned to online learning, leaving millions of students without meaningful educational alternatives. Closing the digital divide requires coordinated investment in broadband infrastructure, provision of affordable computing devices, and development of digital literacy programs that empower students and educators to leverage technology effectively. Public-private partnerships between governments, technology companies, and educational institutions offer a pathway to making digital learning accessible to all students regardless of their socioeconomic background or geographic location.",
      },
      {
        id: "student-010",
        title: "Impact of Social Media on Youth Mental Health",
        content: "Social media platforms have become deeply integrated into the daily lives of young people, raising significant concerns about their impact on mental health and psychological well-being. Research has identified associations between heavy social media use and increased rates of anxiety, depression, loneliness, and poor body image among adolescents and young adults. The curated nature of social media content creates unrealistic comparisons, as users are constantly exposed to idealized representations of peers' lives, appearances, and achievements. Cyberbullying and online harassment represent serious threats to youth mental health, with digital platforms providing new avenues for peer victimization that extend beyond the traditional school environment. Sleep disruption caused by late-night screen time and the compulsive need to check notifications further compromise mental health outcomes. Strategies for promoting healthy social media use include digital literacy education, parental guidance on age-appropriate platform use, and the development of platform features that prioritize user well-being over engagement metrics.",
      },
      {
        id: "student-011",
        title: "Renewable Energy Adoption in West Africa",
        content: "West Africa possesses enormous renewable energy potential that remains largely untapped despite the region's growing energy demands. Solar irradiance levels across the Sahel and savanna zones are among the highest in the world, making solar photovoltaic technology a particularly attractive option for electricity generation. Offshore and onshore wind resources in countries such as Senegal, Ghana, and Nigeria offer additional renewable energy capacity. Small-scale hydropower systems along the region's numerous river systems can provide reliable electricity to rural communities that are unlikely to be connected to national grids in the near future. The economic case for renewable energy in West Africa has strengthened considerably as the cost of solar panels and wind turbines has declined dramatically over the past decade. However, barriers to renewable energy adoption remain, including limited access to financing, inadequate regulatory frameworks, and the need for grid modernization to accommodate variable renewable energy sources.",
      },
      {
        id: "student-012",
        title: "Data Privacy in the Era of Big Data Analytics",
        content: "The proliferation of big data analytics has fundamentally transformed how organizations collect, process, and utilize personal information, creating urgent challenges for data privacy protection. Machine learning algorithms can infer sensitive personal attributes including health conditions, political preferences, and sexual orientation from seemingly innocuous data points, raising concerns about function creep and the potential for discrimination. The commodification of personal data has created a vast data economy in which individual users often have limited awareness or control over how their information is collected, shared, and monetized. Regulatory frameworks such as the General Data Protection Regulation in Europe and the California Consumer Privacy Act in the United States represent important steps toward establishing data protection standards, but enforcement remains challenging in a borderless digital environment. Privacy-enhancing technologies including differential privacy, federated learning, and homomorphic encryption offer technical approaches to enabling data analytics while preserving individual privacy, but their widespread adoption requires balancing innovation with protection in ways that are both effective and practically implementable.",
      },
      {
        id: "student-013",
        title: "Agricultural Technology and Food Security in Africa",
        content: "Agricultural technology innovations hold immense promise for addressing food security challenges across the African continent. Precision agriculture techniques that leverage satellite imagery, drone technology, and soil sensors enable farmers to optimize crop yields while minimizing the use of water, fertilizers, and pesticides. Mobile-based agricultural advisory services provide smallholder farmers with real-time information about weather forecasts, market prices, and best farming practices, bridging knowledge gaps that have historically limited agricultural productivity. Biotechnology advances including drought-resistant and pest-resistant crop varieties offer solutions to the challenges posed by climate change and growing pest pressures. Post-harvest loss reduction technologies including improved storage facilities, solar-powered cold chain systems, and food processing equipment help ensure that harvested crops reach consumers in edible condition. The successful adoption of agricultural technologies in Africa requires investment in rural infrastructure, extension services, and farmer training programs that build local capacity for sustainable agricultural intensification.",
      },
      {
        id: "student-014",
        title: "The Future of Work: Automation and Employment in Developing Countries",
        content: "Automation and artificial intelligence are reshaping the global labor market in ways that have profound implications for developing countries. While automation has the potential to increase productivity and create new types of employment, it also threatens to displace large numbers of workers in industries that have traditionally served as engines of economic development, including manufacturing, agriculture, and business process outsourcing. Developing countries that have relied on low-cost labor as a competitive advantage face the risk of premature deindustrialization as advanced manufacturing technologies reduce the need for labor-intensive production. The gig economy, facilitated by digital platforms, offers new income-generating opportunities but often without the protections and benefits associated with formal employment. Preparing the workforce of developing countries for the future of work requires significant investments in education and vocational training systems that equip workers with the skills needed to thrive in an increasingly automated economy, with emphasis on digital literacy, critical thinking, creativity, and adaptability.",
      },
      {
        id: "student-015",
        title: "Gender Disparities in STEM Education and Careers",
        content: "Gender disparities in science, technology, engineering, and mathematics fields persist as a significant challenge for achieving both equity and economic competitiveness. From an early age, societal stereotypes and implicit biases discourage girls from pursuing STEM subjects, resulting in declining female participation in advanced mathematics and science courses throughout secondary and tertiary education. Women who do enter STEM careers face additional obstacles including wage gaps compared to male counterparts, limited access to mentorship and professional networks, and workplace cultures that can be unwelcoming or hostile. The underrepresentation of women in STEM fields represents not only a social justice concern but also an economic inefficiency, as diverse teams have been shown to produce more innovative and effective solutions to complex problems. Interventions that have demonstrated effectiveness in reducing gender disparities include targeted scholarship programs, female role models and mentorship initiatives, curriculum reforms that highlight contributions of women scientists, and organizational policies that support work-life balance and address unconscious bias in hiring and promotion processes.",
      },
    ];

    for (const paper of studentPapers) {
      const fingerprints = engine.generateFingerprints(paper.content);
      const entries: FingerprintEntry[] = fingerprints.map(fp => ({
        hash: fp.hash,
        documentId: paper.id,
        position: fp.position,
        ngram: fp.ngram,
        sourceTitle: paper.title,
        sourceUrl: undefined,
        sourceType: 'student_paper',
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

// FingerprintEntry is already exported via `export interface`
