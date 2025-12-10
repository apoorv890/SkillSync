import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Job from '../models/Job.js';
import connectDB from '../config/database.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const jobOpenings = [
  {
    title: "Senior Frontend Developer (React/Next.js)",
    location: "Pune: Hybrid / Remote",
    workType: "Full-time",
    status: "active",
    summary: "Join our team as a Senior Frontend Developer to build cutting-edge web applications using React and Next.js. You'll work on creating seamless user experiences, optimizing performance, and mentoring junior developers in modern frontend practices.",
    keyResponsibilities: "• Design and develop responsive, high-performance web applications using React.js and Next.js.\n• Implement server-side rendering (SSR) and static site generation (SSG) strategies.\n• Optimize applications for maximum speed and scalability.\n• Collaborate with UX/UI designers to translate designs into pixel-perfect implementations.\n• Write clean, maintainable, and well-tested code following industry best practices.\n• Mentor junior developers and conduct code reviews.\n• Integrate RESTful APIs and GraphQL endpoints.\n• Implement state management solutions using Redux, Zustand, or Context API.\n• Ensure cross-browser compatibility and responsive design.\n• Stay updated with latest frontend technologies and trends.",
    requiredSkills: "• Bachelor's degree in Computer Science or related field.\n• 4+ years of experience in frontend development.\n• Expert-level knowledge of React.js, Next.js, and TypeScript.\n• Strong proficiency in HTML5, CSS3, SASS/SCSS, and modern CSS frameworks.\n• Experience with state management libraries (Redux, MobX, Zustand).\n• Solid understanding of RESTful APIs and asynchronous programming.\n• Proficiency with Git, npm/yarn, and modern build tools (Webpack, Vite).\n• Experience with responsive design and mobile-first development.\n• Strong problem-solving skills and attention to detail.",
    preferredSkills: "• Experience with GraphQL and Apollo Client.\n• Knowledge of Web Performance Optimization techniques.\n• Familiarity with testing frameworks (Jest, React Testing Library, Cypress).\n• Experience with CI/CD pipelines and deployment platforms (Vercel, Netlify).\n• Understanding of SEO best practices.\n• Experience with design systems and component libraries (Material-UI, Chakra UI, shadcn/ui).",
    aboutCompany: "We are a product-based company focused on delivering innovative digital solutions. Our engineering culture emphasizes quality, collaboration, and continuous learning. We believe in giving our developers the freedom to experiment and grow.",
    compensation: "• Competitive salary (₹15-25 LPA based on experience)\n• Performance-based bonuses\n• Flexible work hours and remote options\n• Health insurance for you and your family\n• Learning and development budget\n• Annual team retreats\n• Modern tech stack and tools"
  },
  {
    title: "DevOps Engineer",
    location: "Hyderabad: On-site / Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "We're looking for an experienced DevOps Engineer to streamline our development operations, automate infrastructure, and ensure high availability of our services. You'll work with cutting-edge cloud technologies and help scale our infrastructure.",
    keyResponsibilities: "• Design, implement, and maintain CI/CD pipelines using Jenkins, GitLab CI, or GitHub Actions.\n• Manage and optimize cloud infrastructure on AWS, Azure, or GCP.\n• Implement Infrastructure as Code (IaC) using Terraform, CloudFormation, or Pulumi.\n• Configure and manage containerization using Docker and orchestration with Kubernetes.\n• Monitor system performance, troubleshoot issues, and implement solutions.\n• Automate deployment processes and infrastructure provisioning.\n• Implement security best practices and compliance requirements.\n• Manage databases, caching layers, and message queues.\n• Collaborate with development teams to optimize application performance.\n• Document infrastructure architecture and operational procedures.",
    requiredSkills: "• Bachelor's degree in Computer Science, Engineering, or related field.\n• 3+ years of experience in DevOps or Site Reliability Engineering.\n• Strong experience with AWS, Azure, or Google Cloud Platform.\n• Proficiency in scripting languages (Python, Bash, PowerShell).\n• Hands-on experience with Docker and Kubernetes.\n• Experience with CI/CD tools (Jenkins, GitLab CI, CircleCI).\n• Knowledge of Infrastructure as Code tools (Terraform, Ansible, CloudFormation).\n• Understanding of networking, security, and system administration.\n• Experience with monitoring tools (Prometheus, Grafana, ELK Stack).",
    preferredSkills: "• AWS/Azure/GCP certifications.\n• Experience with service mesh (Istio, Linkerd).\n• Knowledge of GitOps practices (ArgoCD, Flux).\n• Experience with serverless architectures.\n• Familiarity with configuration management tools (Ansible, Chef, Puppet).\n• Understanding of microservices architecture.",
    aboutCompany: "We're a rapidly growing tech company building scalable cloud-native applications. Our DevOps team plays a crucial role in maintaining our infrastructure and enabling rapid, reliable deployments.",
    compensation: "• Competitive salary (₹12-22 LPA)\n• Cloud certification reimbursements\n• Flexible working arrangements\n• Health and wellness benefits\n• Professional development opportunities\n• Latest tools and technologies\n• Collaborative team environment"
  },
  {
    title: "Machine Learning Engineer",
    location: "Bangalore: Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "Join our AI team to develop and deploy machine learning models that power our intelligent products. You'll work on challenging problems in NLP, computer vision, and predictive analytics while collaborating with data scientists and engineers.",
    keyResponsibilities: "• Design, develop, and deploy machine learning models for production environments.\n• Build and optimize data pipelines for model training and inference.\n• Implement MLOps practices for model versioning, monitoring, and deployment.\n• Collaborate with data scientists to productionize research models.\n• Optimize model performance for latency, throughput, and resource utilization.\n• Develop APIs and services for model serving.\n• Conduct A/B testing and evaluate model performance.\n• Stay current with latest ML/AI research and technologies.\n• Document model architectures, experiments, and results.\n• Mentor junior team members on ML best practices.",
    requiredSkills: "• Bachelor's or Master's degree in Computer Science, AI/ML, or related field.\n• 2-5 years of experience in machine learning engineering.\n• Strong programming skills in Python and experience with ML frameworks (TensorFlow, PyTorch, scikit-learn).\n• Experience deploying ML models in production environments.\n• Knowledge of data preprocessing, feature engineering, and model evaluation.\n• Familiarity with cloud platforms (AWS SageMaker, Azure ML, GCP AI Platform).\n• Understanding of software engineering principles and best practices.\n• Experience with version control (Git) and collaborative development.\n• Strong mathematical foundation in statistics and linear algebra.",
    preferredSkills: "• Experience with deep learning architectures (CNNs, RNNs, Transformers).\n• Knowledge of MLOps tools (MLflow, Kubeflow, Weights & Biases).\n• Experience with distributed training and model optimization.\n• Familiarity with NLP libraries (Hugging Face, spaCy).\n• Experience with computer vision libraries (OpenCV, YOLO).\n• Knowledge of model compression and quantization techniques.\n• Publications or contributions to ML research.",
    aboutCompany: "We're an AI-first company building intelligent solutions that transform industries. Our ML team works on cutting-edge problems with access to large-scale datasets and computational resources.",
    compensation: "• Competitive salary (₹18-30 LPA)\n• GPU workstations and cloud compute credits\n• Conference and research paper publication support\n• Flexible work arrangements\n• Health insurance and wellness programs\n• Learning budget for courses and certifications\n• Stock options"
  },
  {
    title: "Backend Developer (Java/Spring Boot)",
    location: "Chennai: On-site",
    workType: "Full-time",
    status: "active",
    summary: "We're seeking a skilled Backend Developer with expertise in Java and Spring Boot to build robust, scalable microservices. You'll be responsible for designing APIs, optimizing database queries, and ensuring system reliability.",
    keyResponsibilities: "• Design and develop RESTful APIs using Spring Boot framework.\n• Build microservices architecture with proper service boundaries.\n• Implement authentication and authorization using Spring Security, OAuth2, JWT.\n• Optimize database queries and design efficient data models.\n• Write unit tests and integration tests using JUnit, Mockito.\n• Implement caching strategies using Redis or Memcached.\n• Integrate message queues (RabbitMQ, Kafka) for asynchronous processing.\n• Monitor application performance and troubleshoot production issues.\n• Participate in code reviews and maintain code quality standards.\n• Collaborate with frontend developers and DevOps teams.",
    requiredSkills: "• Bachelor's degree in Computer Science or related field.\n• 3+ years of experience in Java backend development.\n• Strong proficiency in Java 8+, Spring Boot, Spring MVC, Spring Data JPA.\n• Experience with relational databases (MySQL, PostgreSQL) and ORM frameworks (Hibernate).\n• Understanding of RESTful API design principles.\n• Knowledge of design patterns and SOLID principles.\n• Experience with build tools (Maven, Gradle) and version control (Git).\n• Familiarity with microservices architecture.\n• Strong problem-solving and debugging skills.",
    preferredSkills: "• Experience with NoSQL databases (MongoDB, Cassandra).\n• Knowledge of message brokers (Kafka, RabbitMQ).\n• Familiarity with containerization (Docker) and orchestration (Kubernetes).\n• Experience with cloud platforms (AWS, Azure).\n• Understanding of event-driven architecture.\n• Knowledge of GraphQL.",
    aboutCompany: "We're an enterprise software company building mission-critical applications for global clients. Our engineering team values clean code, robust architecture, and continuous improvement.",
    compensation: "• Competitive salary (₹10-18 LPA)\n• Performance bonuses\n• Health insurance\n• Professional certification support\n• Work-life balance\n• Career growth opportunities\n• Modern office facilities"
  },
  {
    title: "Full Stack Developer (Python/Django)",
    location: "Mumbai: Hybrid / Remote",
    workType: "Full-time",
    status: "active",
    summary: "Looking for a versatile Full Stack Developer proficient in Python and Django to build end-to-end web applications. You'll work on both backend APIs and frontend interfaces, delivering complete features independently.",
    keyResponsibilities: "• Develop full-stack web applications using Django and modern JavaScript frameworks.\n• Design and implement RESTful APIs using Django REST Framework.\n• Build responsive frontend interfaces using React, Vue.js, or Angular.\n• Implement user authentication, authorization, and security best practices.\n• Design and optimize database schemas using PostgreSQL or MySQL.\n• Write automated tests for both backend and frontend code.\n• Deploy applications to cloud platforms (AWS, Heroku, DigitalOcean).\n• Integrate third-party APIs and services.\n• Optimize application performance and scalability.\n• Participate in agile development processes and sprint planning.",
    requiredSkills: "• Bachelor's degree in Computer Science or related field.\n• 2-4 years of full-stack development experience.\n• Strong proficiency in Python and Django framework.\n• Experience with Django REST Framework for API development.\n• Knowledge of frontend technologies (HTML, CSS, JavaScript, React/Vue).\n• Experience with relational databases and SQL.\n• Understanding of version control systems (Git).\n• Familiarity with Linux/Unix environments.\n• Knowledge of web security best practices.",
    preferredSkills: "• Experience with Celery for background task processing.\n• Knowledge of Django Channels for WebSocket support.\n• Familiarity with Docker and containerization.\n• Experience with CI/CD pipelines.\n• Understanding of GraphQL and Django Graphene.\n• Knowledge of frontend state management (Redux, Vuex).\n• Experience with testing frameworks (pytest, Jest).",
    aboutCompany: "We're a product company building innovative SaaS solutions for businesses. Our team values ownership, creativity, and delivering high-quality software that users love.",
    compensation: "• Competitive salary (₹12-20 LPA)\n• Flexible work hours\n• Remote work options\n• Health insurance\n• Learning and development budget\n• Team outings and events\n• Modern tech stack"
  },
  {
    title: "Mobile App Developer (React Native)",
    location: "Noida: On-site / Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "We're hiring a talented Mobile App Developer with React Native expertise to build cross-platform mobile applications. You'll create beautiful, performant apps for both iOS and Android platforms.",
    keyResponsibilities: "• Develop cross-platform mobile applications using React Native.\n• Build reusable components and libraries for future use.\n• Implement pixel-perfect UIs matching design specifications.\n• Integrate with backend APIs and third-party services.\n• Optimize app performance and memory usage.\n• Implement push notifications, deep linking, and analytics.\n• Handle app store submissions and updates (iOS App Store, Google Play).\n• Debug and fix issues across different devices and OS versions.\n• Write unit tests and integration tests.\n• Collaborate with designers, backend developers, and product managers.",
    requiredSkills: "• Bachelor's degree in Computer Science or related field.\n• 2+ years of experience in mobile app development.\n• Strong proficiency in React Native and JavaScript/TypeScript.\n• Experience with React Native navigation libraries (React Navigation).\n• Knowledge of mobile app architecture patterns (Redux, MobX, Context API).\n• Understanding of iOS and Android platform differences.\n• Experience with native modules and bridging when needed.\n• Familiarity with mobile app deployment processes.\n• Knowledge of RESTful APIs and asynchronous programming.",
    preferredSkills: "• Experience with native iOS (Swift) or Android (Kotlin) development.\n• Knowledge of Expo framework.\n• Familiarity with mobile app testing tools (Detox, Appium).\n• Experience with Firebase services (Authentication, Firestore, Cloud Messaging).\n• Understanding of mobile app security best practices.\n• Knowledge of app performance optimization techniques.\n• Experience with CodePush for over-the-air updates.",
    aboutCompany: "We're a mobile-first company creating engaging apps used by millions of users. Our development team focuses on delivering smooth, intuitive experiences across all devices.",
    compensation: "• Competitive salary (₹10-18 LPA)\n• Latest MacBook and iPhone/Android devices for testing\n• Flexible working hours\n• Health insurance\n• Professional development opportunities\n• Team building activities\n• Performance bonuses"
  },
  {
    title: "Data Engineer",
    location: "Bangalore: Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "Join our data team as a Data Engineer to build and maintain scalable data pipelines and infrastructure. You'll work with big data technologies to process, transform, and deliver data that powers business decisions.",
    keyResponsibilities: "• Design, build, and maintain scalable data pipelines using modern ETL/ELT tools.\n• Develop data models and schemas for data warehouses and data lakes.\n• Implement data quality checks and monitoring systems.\n• Optimize data processing jobs for performance and cost efficiency.\n• Work with big data technologies (Spark, Hadoop, Kafka).\n• Build and maintain data infrastructure on cloud platforms (AWS, Azure, GCP).\n• Collaborate with data scientists and analysts to understand data requirements.\n• Implement data security and governance policies.\n• Automate data workflows and orchestration using Airflow or similar tools.\n• Document data pipelines and maintain data catalogs.",
    requiredSkills: "• Bachelor's degree in Computer Science, Engineering, or related field.\n• 3+ years of experience in data engineering.\n• Strong programming skills in Python, Scala, or Java.\n• Experience with SQL and database technologies (PostgreSQL, MySQL, Redshift).\n• Knowledge of big data frameworks (Apache Spark, Hadoop).\n• Experience with cloud data services (AWS S3, Glue, EMR, Azure Data Factory).\n• Familiarity with data warehousing concepts and dimensional modeling.\n• Understanding of data pipeline orchestration tools (Apache Airflow, Luigi).\n• Experience with version control and CI/CD practices.",
    preferredSkills: "• Experience with real-time data processing (Kafka, Flink).\n• Knowledge of data lake architectures (Delta Lake, Apache Iceberg).\n• Familiarity with dbt (data build tool) for data transformation.\n• Experience with NoSQL databases (MongoDB, Cassandra).\n• Understanding of data governance and compliance (GDPR, CCPA).\n• Knowledge of containerization and Kubernetes.\n• Experience with data visualization tools (Tableau, Looker).",
    aboutCompany: "We're a data-driven organization leveraging analytics and machine learning to deliver insights. Our data engineering team builds the foundation that enables data science and business intelligence.",
    compensation: "• Competitive salary (₹15-25 LPA)\n• Cloud certification reimbursements\n• Flexible work arrangements\n• Health and wellness benefits\n• Learning budget\n• Conference attendance opportunities\n• Stock options"
  },
  {
    title: "Cybersecurity Analyst",
    location: "Delhi: On-site",
    workType: "Full-time",
    status: "active",
    summary: "We're seeking a Cybersecurity Analyst to protect our systems and data from security threats. You'll monitor security events, conduct vulnerability assessments, and implement security best practices across our infrastructure.",
    keyResponsibilities: "• Monitor security events and alerts using SIEM tools.\n• Conduct vulnerability assessments and penetration testing.\n• Respond to security incidents and coordinate incident response.\n• Implement and maintain security controls and policies.\n• Perform security audits and compliance assessments.\n• Analyze security logs and identify potential threats.\n• Develop and maintain security documentation and procedures.\n• Conduct security awareness training for employees.\n• Stay updated with latest security threats and vulnerabilities.\n• Collaborate with IT teams to implement security solutions.",
    requiredSkills: "• Bachelor's degree in Computer Science, Cybersecurity, or related field.\n• 2-4 years of experience in cybersecurity or information security.\n• Knowledge of security frameworks (NIST, ISO 27001, CIS Controls).\n• Experience with security tools (SIEM, IDS/IPS, firewalls, antivirus).\n• Understanding of network security and protocols.\n• Familiarity with operating systems security (Windows, Linux).\n• Knowledge of web application security (OWASP Top 10).\n• Experience with vulnerability scanning tools (Nessus, Qualys).\n• Strong analytical and problem-solving skills.",
    preferredSkills: "• Security certifications (CEH, CISSP, CompTIA Security+, OSCP).\n• Experience with cloud security (AWS, Azure, GCP).\n• Knowledge of security automation and scripting (Python, PowerShell).\n• Familiarity with threat intelligence platforms.\n• Experience with container security (Docker, Kubernetes).\n• Understanding of DevSecOps practices.\n• Knowledge of forensics and malware analysis.",
    aboutCompany: "We're a security-conscious organization committed to protecting our customers' data and maintaining trust. Our security team plays a vital role in safeguarding our infrastructure and applications.",
    compensation: "• Competitive salary (₹12-20 LPA)\n• Security certification reimbursements\n• Health insurance\n• Professional development opportunities\n• Work-life balance\n• Latest security tools and training\n• Performance bonuses"
  },
  {
    title: "Cloud Architect",
    location: "Bangalore: Hybrid / Remote",
    workType: "Full-time",
    status: "active",
    summary: "We're looking for an experienced Cloud Architect to design and implement cloud infrastructure solutions. You'll lead cloud migration initiatives, optimize costs, and ensure our cloud architecture is scalable, secure, and reliable.",
    keyResponsibilities: "• Design cloud architecture solutions aligned with business requirements.\n• Lead cloud migration projects from on-premises to cloud.\n• Implement multi-cloud and hybrid cloud strategies.\n• Optimize cloud costs and resource utilization.\n• Ensure security, compliance, and governance in cloud environments.\n• Define cloud standards, best practices, and reference architectures.\n• Evaluate and recommend cloud services and technologies.\n• Mentor development teams on cloud-native design patterns.\n• Conduct architecture reviews and provide technical guidance.\n• Create technical documentation and architecture diagrams.",
    requiredSkills: "• Bachelor's or Master's degree in Computer Science or related field.\n• 5+ years of experience in cloud architecture and engineering.\n• Deep expertise in at least one major cloud platform (AWS, Azure, GCP).\n• Strong understanding of cloud services (compute, storage, networking, databases).\n• Experience with Infrastructure as Code (Terraform, CloudFormation).\n• Knowledge of containerization and orchestration (Docker, Kubernetes).\n• Understanding of microservices and serverless architectures.\n• Experience with cloud security and compliance frameworks.\n• Excellent communication and stakeholder management skills.",
    preferredSkills: "• Multiple cloud certifications (AWS Solutions Architect, Azure Architect, GCP Architect).\n• Experience with multi-cloud management platforms.\n• Knowledge of FinOps and cloud cost optimization.\n• Familiarity with service mesh and API gateways.\n• Experience with disaster recovery and business continuity planning.\n• Understanding of edge computing and CDN technologies.\n• Experience with cloud-native databases and data services.",
    aboutCompany: "We're a cloud-native company building scalable solutions for enterprise clients. Our cloud architects drive technical excellence and innovation across our infrastructure.",
    compensation: "• Competitive salary (₹25-40 LPA)\n• Cloud certification reimbursements\n• Flexible work arrangements\n• Health insurance and wellness programs\n• Conference and training opportunities\n• Stock options\n• Leadership development programs"
  },
  {
    title: "QA Automation Engineer",
    location: "Pune: Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "Join our quality assurance team as an Automation Engineer to build and maintain automated testing frameworks. You'll ensure software quality through comprehensive test coverage and continuous testing practices.",
    keyResponsibilities: "• Design and develop automated test frameworks for web and mobile applications.\n• Write and maintain automated test scripts using Selenium, Cypress, or Playwright.\n• Implement API testing using Postman, RestAssured, or similar tools.\n• Integrate automated tests into CI/CD pipelines.\n• Perform performance and load testing using JMeter or Gatling.\n• Identify, document, and track bugs and issues.\n• Collaborate with developers to understand features and requirements.\n• Conduct code reviews for test scripts.\n• Generate test reports and metrics.\n• Continuously improve test coverage and automation strategies.",
    requiredSkills: "• Bachelor's degree in Computer Science or related field.\n• 3+ years of experience in QA automation.\n• Strong programming skills in Java, Python, or JavaScript.\n• Experience with test automation frameworks (Selenium, Cypress, Playwright).\n• Knowledge of API testing tools (Postman, RestAssured).\n• Understanding of CI/CD tools (Jenkins, GitLab CI, GitHub Actions).\n• Familiarity with version control systems (Git).\n• Experience with bug tracking tools (Jira, Bugzilla).\n• Strong analytical and problem-solving skills.",
    preferredSkills: "• Experience with mobile automation (Appium, Detox).\n• Knowledge of performance testing tools (JMeter, Gatling, K6).\n• Familiarity with BDD frameworks (Cucumber, SpecFlow).\n• Experience with containerization (Docker).\n• Understanding of security testing practices.\n• Knowledge of test management tools (TestRail, Zephyr).\n• ISTQB or similar testing certifications.",
    aboutCompany: "We're committed to delivering high-quality software to our users. Our QA team plays a crucial role in ensuring reliability, performance, and user satisfaction.",
    compensation: "• Competitive salary (₹10-18 LPA)\n• Flexible working hours\n• Health insurance\n• Professional certification support\n• Learning and development opportunities\n• Work-life balance\n• Modern testing tools and infrastructure"
  },
  {
    title: "Blockchain Developer",
    location: "Bangalore: Remote / Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "We're seeking a Blockchain Developer to build decentralized applications and smart contracts. You'll work on innovative blockchain solutions using Ethereum, Solidity, and Web3 technologies.",
    keyResponsibilities: "• Design and develop smart contracts using Solidity or Rust.\n• Build decentralized applications (dApps) using Web3.js or Ethers.js.\n• Implement and test blockchain protocols and consensus mechanisms.\n• Integrate blockchain solutions with existing systems.\n• Conduct security audits of smart contracts.\n• Optimize gas costs and contract performance.\n• Develop and maintain blockchain infrastructure and nodes.\n• Create technical documentation for blockchain implementations.\n• Stay updated with blockchain technology trends and best practices.\n• Collaborate with cross-functional teams on blockchain initiatives.",
    requiredSkills: "• Bachelor's degree in Computer Science or related field.\n• 2+ years of experience in blockchain development.\n• Strong proficiency in Solidity and smart contract development.\n• Experience with Ethereum, Web3.js, and blockchain development tools (Truffle, Hardhat).\n• Understanding of blockchain concepts (consensus, cryptography, distributed systems).\n• Knowledge of JavaScript/TypeScript for dApp development.\n• Familiarity with IPFS and decentralized storage.\n• Experience with version control (Git).\n• Strong problem-solving and analytical skills.",
    preferredSkills: "• Experience with other blockchain platforms (Polygon, Binance Smart Chain, Solana).\n• Knowledge of Layer 2 solutions and scaling technologies.\n• Familiarity with DeFi protocols and NFT standards (ERC-20, ERC-721, ERC-1155).\n• Experience with blockchain security and auditing.\n• Understanding of tokenomics and governance mechanisms.\n• Knowledge of Rust for Solana development.\n• Experience with The Graph for blockchain indexing.",
    aboutCompany: "We're a blockchain-focused company building the future of decentralized finance and Web3 applications. Our team is passionate about blockchain technology and its transformative potential.",
    compensation: "• Competitive salary (₹15-28 LPA)\n• Crypto token incentives\n• Remote work flexibility\n• Health insurance\n• Learning and conference attendance\n• Latest development tools\n• Innovative work environment"
  },
  {
    title: "UI/UX Designer (with Frontend Skills)",
    location: "Mumbai: Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "We're looking for a UI/UX Designer who can also code to bridge the gap between design and development. You'll create beautiful interfaces and implement them using modern frontend technologies.",
    keyResponsibilities: "• Design user interfaces and experiences for web and mobile applications.\n• Create wireframes, prototypes, and high-fidelity mockups using Figma or Adobe XD.\n• Implement designs using HTML, CSS, and JavaScript frameworks.\n• Conduct user research and usability testing.\n• Develop and maintain design systems and component libraries.\n• Collaborate with product managers and developers on feature design.\n• Ensure responsive design and accessibility standards.\n• Create animations and micro-interactions.\n• Optimize designs for performance and user experience.\n• Stay updated with design trends and best practices.",
    requiredSkills: "• Bachelor's degree in Design, Computer Science, or related field.\n• 2-4 years of experience in UI/UX design.\n• Proficiency in design tools (Figma, Adobe XD, Sketch).\n• Strong skills in HTML, CSS, and JavaScript.\n• Experience with CSS frameworks (Tailwind CSS, Bootstrap).\n• Knowledge of React, Vue, or Angular.\n• Understanding of responsive design and mobile-first approach.\n• Portfolio demonstrating design and development work.\n• Strong visual design skills and attention to detail.",
    preferredSkills: "• Experience with design systems (Material Design, Ant Design, shadcn/ui).\n• Knowledge of animation libraries (Framer Motion, GSAP).\n• Familiarity with prototyping tools (ProtoPie, Principle).\n• Understanding of accessibility standards (WCAG).\n• Experience with user research methodologies.\n• Knowledge of design tokens and CSS-in-JS.\n• Basic understanding of backend technologies.",
    aboutCompany: "We're a design-led company that values beautiful, intuitive user experiences. Our design team works closely with engineering to create products that users love.",
    compensation: "• Competitive salary (₹12-20 LPA)\n• Creative freedom and ownership\n• Latest design tools and software\n• Flexible work hours\n• Health insurance\n• Learning and conference budget\n• Collaborative work environment"
  },
  {
    title: "Site Reliability Engineer (SRE)",
    location: "Bangalore: On-site / Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "Join our SRE team to ensure the reliability, performance, and scalability of our production systems. You'll work on automation, monitoring, and incident response to maintain high availability.",
    keyResponsibilities: "• Monitor system health, performance, and availability using observability tools.\n• Implement and maintain SLIs, SLOs, and error budgets.\n• Automate operational tasks and reduce toil.\n• Respond to incidents and conduct post-mortem analyses.\n• Design and implement disaster recovery and backup strategies.\n• Optimize system performance and resource utilization.\n• Build and maintain infrastructure automation using IaC tools.\n• Collaborate with development teams on reliability improvements.\n• Implement chaos engineering practices.\n• Develop runbooks and operational documentation.",
    requiredSkills: "• Bachelor's degree in Computer Science or related field.\n• 3+ years of experience in SRE, DevOps, or systems engineering.\n• Strong programming skills in Python, Go, or similar languages.\n• Experience with cloud platforms (AWS, GCP, Azure).\n• Proficiency in containerization (Docker) and orchestration (Kubernetes).\n• Knowledge of monitoring and observability tools (Prometheus, Grafana, ELK, Datadog).\n• Understanding of networking, load balancing, and distributed systems.\n• Experience with incident management and on-call rotations.\n• Strong troubleshooting and problem-solving skills.",
    preferredSkills: "• Experience with service mesh (Istio, Linkerd).\n• Knowledge of chaos engineering tools (Chaos Monkey, Gremlin).\n• Familiarity with GitOps practices.\n• Experience with database administration and optimization.\n• Understanding of security best practices.\n• Knowledge of capacity planning and performance tuning.\n• SRE or cloud certifications.",
    aboutCompany: "We're a high-scale platform serving millions of users. Our SRE team ensures our systems are reliable, performant, and can handle rapid growth.",
    compensation: "• Competitive salary (₹15-28 LPA)\n• On-call compensation\n• Flexible work arrangements\n• Health insurance\n• Professional development budget\n• Latest tools and technologies\n• Stock options"
  },
  {
    title: "Game Developer (Unity/Unreal)",
    location: "Hyderabad: On-site",
    workType: "Full-time",
    status: "active",
    summary: "We're hiring a Game Developer to create engaging gaming experiences using Unity or Unreal Engine. You'll work on gameplay mechanics, graphics, and optimization for multiple platforms.",
    keyResponsibilities: "• Develop game features and mechanics using Unity or Unreal Engine.\n• Implement gameplay systems, AI, and physics.\n• Optimize game performance for different platforms (PC, mobile, console).\n• Collaborate with artists and designers to implement game assets.\n• Write clean, efficient, and maintainable game code.\n• Debug and fix gameplay issues and bugs.\n• Implement multiplayer and networking features.\n• Integrate third-party SDKs and services (analytics, ads, IAP).\n• Conduct playtesting and iterate based on feedback.\n• Stay updated with game development trends and technologies.",
    requiredSkills: "• Bachelor's degree in Computer Science, Game Development, or related field.\n• 2+ years of experience in game development.\n• Strong proficiency in C# (Unity) or C++ (Unreal Engine).\n• Experience with game engines (Unity or Unreal Engine).\n• Understanding of game design principles and patterns.\n• Knowledge of 3D mathematics, physics, and rendering.\n• Experience with version control (Git, Perforce).\n• Familiarity with mobile game development (iOS, Android).\n• Portfolio of shipped games or projects.",
    preferredSkills: "• Experience with multiplayer game development and networking.\n• Knowledge of shader programming (HLSL, GLSL).\n• Familiarity with game optimization and profiling tools.\n• Experience with VR/AR development.\n• Understanding of game monetization strategies.\n• Knowledge of animation systems and state machines.\n• Experience with procedural generation techniques.",
    aboutCompany: "We're a game studio creating immersive gaming experiences for players worldwide. Our team is passionate about pushing the boundaries of interactive entertainment.",
    compensation: "• Competitive salary (₹10-20 LPA)\n• Game development tools and licenses\n• Flexible work hours\n• Health insurance\n• Game library access\n• Team game nights\n• Creative work environment"
  },
  {
    title: "IoT Engineer",
    location: "Pune: On-site / Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "Join our IoT team to develop connected device solutions and edge computing applications. You'll work on embedded systems, sensor integration, and cloud connectivity for IoT platforms.",
    keyResponsibilities: "• Design and develop IoT solutions for connected devices.\n• Program embedded systems using C/C++ and Python.\n• Integrate sensors, actuators, and communication modules.\n• Implement IoT protocols (MQTT, CoAP, HTTP/HTTPS).\n• Develop firmware for microcontrollers (Arduino, ESP32, Raspberry Pi).\n• Build cloud connectivity and data pipelines for IoT devices.\n• Implement device security and authentication mechanisms.\n• Optimize power consumption and performance.\n• Conduct testing and debugging of IoT systems.\n• Create technical documentation and user guides.",
    requiredSkills: "• Bachelor's degree in Electronics, Computer Science, or related field.\n• 2-4 years of experience in IoT or embedded systems development.\n• Strong programming skills in C/C++ and Python.\n• Experience with microcontrollers and single-board computers.\n• Knowledge of IoT protocols (MQTT, CoAP, BLE, Zigbee).\n• Understanding of electronics and circuit design.\n• Familiarity with cloud IoT platforms (AWS IoT, Azure IoT, Google Cloud IoT).\n• Experience with sensor integration and data acquisition.\n• Strong problem-solving and debugging skills.",
    preferredSkills: "• Experience with RTOS (FreeRTOS, Zephyr).\n• Knowledge of edge computing and fog computing.\n• Familiarity with industrial IoT protocols (Modbus, OPC-UA).\n• Experience with LoRaWAN or other LPWAN technologies.\n• Understanding of machine learning on edge devices.\n• Knowledge of PCB design and hardware prototyping.\n• Experience with IoT security standards.",
    aboutCompany: "We're building smart IoT solutions for industrial and consumer applications. Our engineering team works on cutting-edge connected device technologies.",
    compensation: "• Competitive salary (₹10-18 LPA)\n• Hardware and prototyping budget\n• Flexible work arrangements\n• Health insurance\n• Professional development opportunities\n• Innovation lab access\n• Patent incentives"
  },
  {
    title: "Computer Vision Engineer",
    location: "Bangalore: Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "We're seeking a Computer Vision Engineer to develop AI-powered visual recognition systems. You'll work on image processing, object detection, and deep learning models for real-world applications.",
    keyResponsibilities: "• Develop computer vision algorithms for image and video analysis.\n• Implement object detection, segmentation, and tracking systems.\n• Train and optimize deep learning models using TensorFlow or PyTorch.\n• Build image preprocessing and augmentation pipelines.\n• Deploy computer vision models in production environments.\n• Optimize models for edge devices and real-time processing.\n• Conduct experiments and evaluate model performance.\n• Integrate computer vision systems with applications and services.\n• Stay updated with latest research in computer vision and deep learning.\n• Collaborate with cross-functional teams on vision-based features.",
    requiredSkills: "• Bachelor's or Master's degree in Computer Science, AI, or related field.\n• 2-5 years of experience in computer vision or image processing.\n• Strong programming skills in Python and C++.\n• Experience with computer vision libraries (OpenCV, PIL, scikit-image).\n• Proficiency in deep learning frameworks (TensorFlow, PyTorch).\n• Knowledge of CNN architectures (ResNet, YOLO, Mask R-CNN).\n• Understanding of image processing techniques and algorithms.\n• Experience with model training, evaluation, and optimization.\n• Strong mathematical foundation in linear algebra and calculus.",
    preferredSkills: "• Experience with 3D vision and depth estimation.\n• Knowledge of video processing and temporal modeling.\n• Familiarity with edge deployment (TensorRT, ONNX, OpenVINO).\n• Experience with GANs and generative models.\n• Understanding of multi-modal learning (vision + language).\n• Knowledge of camera calibration and stereo vision.\n• Publications in computer vision conferences (CVPR, ICCV, ECCV).",
    aboutCompany: "We're an AI company building visual intelligence solutions for industries ranging from healthcare to autonomous systems. Our computer vision team works on challenging real-world problems.",
    compensation: "• Competitive salary (₹18-32 LPA)\n• GPU workstations and cloud compute\n• Research publication support\n• Flexible work arrangements\n• Health insurance\n• Conference attendance opportunities\n• Stock options"
  },
  {
    title: "Natural Language Processing Engineer",
    location: "Bangalore: Remote / Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "Join our NLP team to build intelligent language understanding systems. You'll work on text processing, sentiment analysis, chatbots, and large language model applications.",
    keyResponsibilities: "• Develop NLP models for text classification, named entity recognition, and sentiment analysis.\n• Build and fine-tune large language models (LLMs) for specific use cases.\n• Implement chatbots and conversational AI systems.\n• Create text preprocessing and feature extraction pipelines.\n• Deploy NLP models in production environments.\n• Optimize model performance and inference speed.\n• Conduct experiments and evaluate model accuracy.\n• Integrate NLP capabilities into applications and services.\n• Stay current with latest NLP research and techniques.\n• Collaborate with data scientists and engineers on NLP projects.",
    requiredSkills: "• Bachelor's or Master's degree in Computer Science, Linguistics, or related field.\n• 2-5 years of experience in NLP or computational linguistics.\n• Strong programming skills in Python.\n• Experience with NLP libraries (spaCy, NLTK, Hugging Face Transformers).\n• Knowledge of deep learning frameworks (TensorFlow, PyTorch).\n• Understanding of transformer architectures (BERT, GPT, T5).\n• Experience with text preprocessing and feature engineering.\n• Familiarity with vector databases and embeddings.\n• Strong understanding of linguistics and language structure.",
    preferredSkills: "• Experience with LLM fine-tuning and prompt engineering.\n• Knowledge of retrieval-augmented generation (RAG).\n• Familiarity with speech recognition and text-to-speech.\n• Experience with multilingual NLP.\n• Understanding of knowledge graphs and semantic search.\n• Knowledge of LangChain or similar LLM frameworks.\n• Publications in NLP conferences (ACL, EMNLP, NAACL).",
    aboutCompany: "We're building AI-powered language solutions that transform how businesses communicate and understand text data. Our NLP team works on state-of-the-art language models.",
    compensation: "• Competitive salary (₹18-30 LPA)\n• GPU resources and API credits\n• Research publication support\n• Flexible work arrangements\n• Health insurance\n• Learning and conference budget\n• Stock options"
  },
  {
    title: "Systems Programmer (C/C++)",
    location: "Bangalore: On-site",
    workType: "Full-time",
    status: "active",
    summary: "We're seeking a Systems Programmer with deep expertise in C/C++ to work on low-level systems, performance-critical applications, and infrastructure software.",
    keyResponsibilities: "• Develop high-performance systems software using C/C++.\n• Optimize code for performance, memory usage, and latency.\n• Work on operating system internals, drivers, or embedded systems.\n• Implement multi-threaded and concurrent programming solutions.\n• Debug complex systems issues using profiling and debugging tools.\n• Write efficient algorithms and data structures.\n• Collaborate with hardware teams on system integration.\n• Conduct code reviews and maintain code quality.\n• Profile and benchmark system performance.\n• Create technical documentation for system components.",
    requiredSkills: "• Bachelor's or Master's degree in Computer Science or related field.\n• 3+ years of experience in systems programming.\n• Expert-level proficiency in C and C++ (C++11/14/17).\n• Strong understanding of operating systems concepts (memory management, scheduling, IPC).\n• Experience with multi-threading, concurrency, and synchronization.\n• Knowledge of data structures, algorithms, and complexity analysis.\n• Familiarity with Linux/Unix systems programming.\n• Experience with debugging tools (gdb, valgrind, strace).\n• Understanding of computer architecture and hardware.",
    preferredSkills: "• Experience with kernel development or device drivers.\n• Knowledge of network programming and protocols.\n• Familiarity with assembly language.\n• Experience with real-time systems and RTOS.\n• Understanding of compiler design and optimization.\n• Knowledge of distributed systems.\n• Experience with performance profiling tools (perf, gprof).",
    aboutCompany: "We're building high-performance infrastructure software that powers critical systems. Our engineering team values efficiency, reliability, and deep technical expertise.",
    compensation: "• Competitive salary (₹15-28 LPA)\n• High-performance workstations\n• Flexible work hours\n• Health insurance\n• Professional development opportunities\n• Technical conference attendance\n• Stock options"
  },
  {
    title: "Database Administrator (DBA)",
    location: "Chennai: On-site / Hybrid",
    workType: "Full-time",
    status: "active",
    summary: "Join our infrastructure team as a Database Administrator to manage, optimize, and secure our database systems. You'll ensure high availability, performance, and data integrity across our platforms.",
    keyResponsibilities: "• Install, configure, and maintain database systems (MySQL, PostgreSQL, MongoDB).\n• Monitor database performance and optimize queries.\n• Implement backup and recovery strategies.\n• Ensure database security and access control.\n• Perform database upgrades and migrations.\n• Troubleshoot database issues and resolve incidents.\n• Implement high availability and disaster recovery solutions.\n• Optimize database schemas and indexes.\n• Automate database maintenance tasks.\n• Create and maintain database documentation.",
    requiredSkills: "• Bachelor's degree in Computer Science or related field.\n• 3+ years of experience as a Database Administrator.\n• Strong expertise in relational databases (MySQL, PostgreSQL, Oracle).\n• Experience with NoSQL databases (MongoDB, Cassandra, Redis).\n• Proficiency in SQL and query optimization.\n• Knowledge of database backup and recovery procedures.\n• Understanding of database security and compliance.\n• Experience with database monitoring tools.\n• Strong troubleshooting and problem-solving skills.",
    preferredSkills: "• Experience with cloud databases (AWS RDS, Aurora, Azure SQL).\n• Knowledge of database replication and clustering.\n• Familiarity with database automation tools (Ansible, Terraform).\n• Experience with data warehousing (Redshift, Snowflake, BigQuery).\n• Understanding of database performance tuning.\n• Knowledge of database scripting (Python, Bash).\n• DBA certifications (Oracle, MySQL, PostgreSQL).",
    aboutCompany: "We're a data-intensive organization managing large-scale databases for critical applications. Our DBA team ensures data reliability, performance, and security.",
    compensation: "• Competitive salary (₹12-22 LPA)\n• Database certification reimbursements\n• Flexible work arrangements\n• Health insurance\n• Professional development opportunities\n• On-call compensation\n• Performance bonuses"
  }
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();
    
    logger.info('Starting job seeding process...');
    
    // Check if jobs already exist to avoid duplicates
    const existingJobsCount = await Job.countDocuments();
    logger.info(`Current number of jobs in database: ${existingJobsCount}`);
    
    // Set custom date for November 29, 2025 jobs (different times throughout the day)
    const nov29Date1 = new Date('2025-11-29T08:30:00.000Z'); // 2:00 PM IST
    const nov29Date2 = new Date('2025-11-29T10:15:00.000Z'); // 3:45 PM IST
    const nov29Date3 = new Date('2025-11-29T12:45:00.000Z'); // 6:15 PM IST
    const nov29Date4 = new Date('2025-11-29T14:20:00.000Z'); // 7:50 PM IST
    const nov29Date5 = new Date('2025-11-29T16:00:00.000Z'); // 9:30 PM IST
    
    // Add createdAt dates to November 29 jobs
    const nov29Jobs = [
      { ...jobOpenings[jobOpenings.length - 5], createdAt: nov29Date1 },
      { ...jobOpenings[jobOpenings.length - 4], createdAt: nov29Date2 },
      { ...jobOpenings[jobOpenings.length - 3], createdAt: nov29Date3 },
      { ...jobOpenings[jobOpenings.length - 2], createdAt: nov29Date4 },
      { ...jobOpenings[jobOpenings.length - 1], createdAt: nov29Date5 }
    ];
    
    // Remove the last 5 jobs from original array and add dated versions
    const regularJobs = jobOpenings.slice(0, -5);
    const allJobs = [...regularJobs, ...nov29Jobs];
    
    // Insert all jobs
    const result = await Job.insertMany(allJobs);
    
    logger.info(`Successfully seeded ${result.length} job openings to the database`);
    logger.info('Job titles seeded:');
    result.forEach((job, index) => {
      logger.info(`${index + 1}. ${job.title} - ${job.location}`);
    });
    
    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
