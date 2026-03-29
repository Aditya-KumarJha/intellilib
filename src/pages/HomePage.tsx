import HeroSlider from "@/components/HomePageComponents/HeroSlider";
import UseCase from "@/components/HomePageComponents/UseCase";
import AiSmartDiscovery from "@/components/HomePageComponents/AiSmartDiscovery";
import Navbar from "@/components/common/Navbar";
import Testimonials from "@/components/HomePageComponents/Testimonials";

const HomePage = () => {
  return (
    <div>
      <Navbar />
      <HeroSlider />
      <UseCase />
      <AiSmartDiscovery />
      <Testimonials />
    </div>
  );
};

export default HomePage;
