import HeroSlider from "@/components/HomePageComponents/HeroSlider";
import UseCase from "@/components/HomePageComponents/UseCase";
import AiSmartDiscovery from "@/components/HomePageComponents/AiSmartDiscovery";
import Navbar from "@/components/common/Navbar";

const HomePage = () => {
  return (
    <div>
      <Navbar />
      <HeroSlider />
      <UseCase />
      <AiSmartDiscovery />
    </div>
  );
};

export default HomePage;
