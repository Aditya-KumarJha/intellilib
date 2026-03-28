import HeroSlider from "@/components/HeroSlider";
import Navbar from "@/components/Navbar";

const HomePage = () => {
  return (
    <div>
      <Navbar />
      <div className="mt-20">
        <HeroSlider />
      </div>
    </div>
  );
};

export default HomePage;
