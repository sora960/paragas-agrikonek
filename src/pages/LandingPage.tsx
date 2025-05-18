import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Globe, Shield, LineChart, Database, Users, Repeat, Leaf, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  className 
}: { 
  icon: React.ComponentType<any>; 
  title: string; 
  description: string; 
  className?: string;
}) => (
  <Card className={cn("p-8 shadow-md hover:shadow-lg transition-all", className)}>
    <div className="w-16 h-16 rounded-full bg-[#e7f7e7] flex items-center justify-center mb-5">
      <Icon className="w-8 h-8 text-[#4F772D]" />
    </div>
    <h3 className="text-2xl font-semibold mb-3">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 mb-5">{description}</p>
    <Link to="#" className="text-[#4F772D] font-medium inline-flex items-center group">
      Learn more 
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 group-hover:translate-x-1 transition-transform">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </Link>
  </Card>
);

const BenefitItem = ({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ComponentType<any>; 
  title: string; 
  description: string;
}) => (
  <div className="flex gap-5 mb-10">
    <div className="w-14 h-14 rounded-full bg-[#4F772D] flex items-center justify-center flex-shrink-0">
      <Icon className="w-7 h-7 text-white" />
    </div>
    <div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  </div>
);

const NewsCard = ({ 
  image, 
  date, 
  title, 
  description, 
  link 
}: { 
  image: string; 
  date: string; 
  title: string; 
  description: string; 
  link: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
    <img src={image} alt={title} className="w-full h-48 object-cover" />
    <div className="p-5">
      <p className="text-gray-500 mb-2">{date}</p>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      <div className="flex flex-col gap-3">
        <Link to={link} className="text-[#4F772D] font-medium inline-flex items-center">
          Read more 
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </Link>
        <p className="text-gray-500 text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          {link}
        </p>
      </div>
    </div>
  </div>
);

// Use the CustomHandshakeIcon name instead of HandshakeIcon to avoid conflict
const CustomHandshakeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
    <path d="M12 5.83 8.11 9.72a2.74 2.74 0 1 1-3.88-3.88l1.95-1.95a2.74 2.74 0 0 1 3.88 0L12 5.83Z"></path>
    <path d="M12 5.83l3.89 3.89a2.74 2.74 0 0 0 3.88-3.88l-1.95-1.95a2.74 2.74 0 0 0-3.88 0L12 5.83Z"></path>
  </svg>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Full-screen background image */}
      <div 
        className="relative min-h-screen flex flex-col"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Navigation */}
        <header className="relative z-10 px-4 py-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <Leaf className="text-green-500 w-6 h-6" />
              <span className="text-white text-2xl font-bold">DAgriKonek</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="#" className="text-white">
                <Globe className="w-6 h-6" />
              </Link>
              <Link to="/login">
                <Button variant="default" className="bg-[#0a1729] hover:bg-[#162a45] text-white px-6">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="container mx-auto px-4 py-16 flex-grow flex">
          <div className="relative z-10 flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Revolutionizing Agricultural Management in the Philippines
              </h1>
              <p className="text-xl mb-8">
                Connect with farmers, organizations, and resources in one secure platform designed to streamline agricultural processes and boost productivity across the Philippines.
              </p>
              <Link to="/register">
                <Button className="bg-[#4F772D] hover:bg-[#3b5a22] text-white px-8 py-6 h-auto text-lg inline-flex items-center">
                  Register Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Button>
              </Link>
            </div>
            
            {/* Card on the right side */}
            <div className="md:w-1/2 mt-10 md:mt-0">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-xl p-8 max-w-md mx-auto">
                <div className="flex justify-center mb-6">
                  <Leaf className="text-[#4F772D] w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-center mb-5">Join DAgriKonek Today</h2>
                <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
                  Connect with farmers, organizations, and resources in one secure platform
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#e7f7e7] p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F772D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <span>Access agricultural resources</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#e7f7e7] p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F772D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <span>Connect with funding opportunities</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#e7f7e7] p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F772D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <span>Join a growing community</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#e7f7e7] p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F772D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <span>Track project performance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" fill="#ffffff" className="dark:fill-gray-900">
            <path d="M0,96L80,80C160,64,320,32,480,21.3C640,11,800,21,960,42.7C1120,64,1280,96,1360,112L1440,128L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          </svg>
        </div>
      </div>
      
      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Discover how DAgriKonek transforms agricultural management with innovative features designed for farmers and organizations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Shield} 
              title="Secure Platform" 
              description="Our platform ensures that all your data and communications are protected with enterprise-grade security."
            />
            
            <FeatureCard 
              icon={LineChart} 
              title="Project Tracking" 
              description="Monitor project progress, track expenses, and measure outcomes with our comprehensive tracking tools."
            />
            
            <FeatureCard 
              icon={Database} 
              title="Resource Management" 
              description="Access a centralized database of agricultural resources, funding opportunities, and technical assistance."
            />
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-1/2">
              <h2 className="text-4xl font-bold mb-10">Benefits for All Stakeholders</h2>
              
              <BenefitItem 
                icon={Users} 
                title="Community Building" 
                description="Connect with other farmers and organizations to share knowledge and resources."
              />
              
              <BenefitItem 
                icon={Repeat} 
                title="Sustainability" 
                description="Implement sustainable farming practices with guidance from agricultural experts."
              />
              
              <BenefitItem 
                icon={Leaf} 
                title="Environmental Impact" 
                description="Reduce your environmental footprint with eco-friendly agricultural solutions."
              />
            </div>
            
            <div className="lg:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=2071&auto=format&fit=crop" 
                alt="Farmers in rice field" 
                className="rounded-lg shadow-xl w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Strategic Partnership */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-2/3">
              <div className="flex items-center gap-4 mb-6">
                <CustomHandshakeIcon />
                <h2 className="text-4xl font-bold">Strategic Partnership</h2>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-8">
                Partnering with the Department of Agriculture, DAgriKonek is dedicated to revolutionizing the agricultural landscape across the Philippines. Our goal is to empower farmers and farmer organizations with innovative digital solutions, streamlining resource allocation and enhancing operational efficiency.
              </p>
              
              <Link to="/register">
                <Button className="bg-[#4F772D] hover:bg-[#3b5a22] text-white px-8 py-3 text-lg inline-flex items-center">
                  Join Our Mission
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Button>
              </Link>
            </div>
            
            <div className="lg:w-1/3 relative">
              <img 
                src="public/lovable-uploads/f2d9edad-b1d3-49cf-b9a8-645921a80118.png" 
                alt="Department of Agriculture Logo" 
                className="mx-auto w-full max-w-xs"
              />
              <div className="absolute right-0 bottom-0 bg-white dark:bg-gray-900 px-4 py-2 rounded-lg shadow">
                <p className="text-[#4F772D] font-medium">Est. 1898</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* News Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Agricultural News</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Catch the latest agriculture news in the Philippines today.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow mb-10">
            <div className="flex border-b dark:border-gray-600">
              <button className="flex-1 text-center py-4 font-medium border-b-2 border-[#4F772D]">Latest Articles</button>
              <button className="flex-1 text-center py-4 font-medium text-gray-500 dark:text-gray-300">Featured Videos</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <NewsCard 
              image="public/lovable-uploads/6ebe9805-d3dc-4b37-a492-bebdd9493ac0.png"
              date="May 15, 2023"
              title="New Agricultural Technology Introduced to Filipino Farmers"
              description="The Department of Agriculture has introduced new farming technologies to help farmers increase their yield."
              link="https://www.example.com/article1"
            />
            
            <NewsCard 
              image="public/lovable-uploads/803cbc2c-8577-4651-b54d-5a254d708176.png"
              date="June 22, 2023"
              title="Government Launches New Subsidy Program for Small Farmers"
              description="A new subsidy program aims to provide financial assistance to small-scale farmers across the Philippines."
              link="https://www.example.com/article2"
            />
            
            <NewsCard 
              image="public/lovable-uploads/c54bc154-7866-4225-9f8c-2feddcbf1814.png"
              date="July 10, 2023"
              title="Climate-Resilient Farming Practices Gain Popularity"
              description="More farmers are adopting climate-resilient farming practices to mitigate the effects of changing weather patterns."
              link="https://www.example.com/article3"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
