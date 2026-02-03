import React from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import QuickAccess from './QuickAccess';
import What from './What';
import SiteFlow from './SiteFlow';
import Footer from './Footer';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <Navbar />
      <Hero />
      <QuickAccess />
      <What />
      <SiteFlow />
      <Footer />
    </div>
  );
}

export default HomePage;
