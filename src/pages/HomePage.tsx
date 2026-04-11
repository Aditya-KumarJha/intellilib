import dynamic from "next/dynamic";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import HeroSlider from "@/components/HomePageComponents/HeroSlider";

const UseCase = dynamic(() => import("@/components/HomePageComponents/UseCase"), {
  loading: () => <div className="h-105 w-full" />,
});
const AiSmartDiscovery = dynamic(
  () => import("@/components/HomePageComponents/AiSmartDiscovery"),
  {
    loading: () => <div className="h-160 w-full" />,
  }
);
const Testimonials = dynamic(
  () => import("@/components/HomePageComponents/Testimonials"),
  {
    loading: () => <div className="h-120 w-full" />,
  }
);
const Contact = dynamic(
  () => import("@/components/HomePageComponents/contact/Contact"),
  {
    loading: () => <div className="h-130 w-full" />,
  }
);

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
