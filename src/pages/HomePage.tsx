import HeroSlider from "@/components/HomePageComponents/HeroSlider";
import UseCase from "@/components/HomePageComponents/UseCase";
import AiSmartDiscovery from "@/components/HomePageComponents/AiSmartDiscovery";
import Navbar from "@/components/common/Navbar";
import Testimonials from "@/components/HomePageComponents/Testimonials";
import Footer from "@/components/common/Footer";
import Contact from "@/components/HomePageComponents/contact/Contact";

const HomePage = () => {
  return (
    <div>
      <Navbar />
      <HeroSlider />
      <UseCase />
      <AiSmartDiscovery />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
};

export default HomePage;
