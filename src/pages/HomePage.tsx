import HeroSlider from "@/components/HomePageComponents/HeroSlider";
import UseCase from "@/components/HomePageComponents/UseCase";
import Navbar from "@/components/common/Navbar";

const HomePage = () => {
  return (
    <div>
      <Navbar />
      <HeroSlider />
      <UseCase />
    </div>
  );
};

export default HomePage;
