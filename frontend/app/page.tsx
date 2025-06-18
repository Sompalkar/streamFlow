"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Play, Users, MessageCircle, History, Mic, Video, Sparkles, ArrowRight, Check } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">StudioFlow</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </a>
              <Link href="/auth/login">
                <Button variant="ghost" className="text-slate-600">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div
            className={`text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4 mr-2" />
              Professional Recording Made Simple
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Record Like a
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Pro</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Create studio-quality recordings with multiple participants, real-time chat, AI transcription, and
              seamless collaboration. All in your browser.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 text-lg"
                >
                  Start Recording Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-slate-300">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Powerful features designed for content creators, podcasters, and teams
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Multi-Participant Recording */}
            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Multi-Participant Recording</h3>
              <p className="text-slate-600 leading-relaxed">
                Record with up to 10 participants simultaneously. Each person's audio and video is captured locally for
                the highest quality.
              </p>
            </Card>

            {/* Real-time Chat */}
            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Real-time Chat</h3>
              <p className="text-slate-600 leading-relaxed">
                Communicate with participants during recording sessions. Share notes, links, and coordinate seamlessly.
              </p>
            </Card>

            {/* AI Transcription */}
            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">AI Transcription</h3>
              <p className="text-slate-600 leading-relaxed">
                Automatic transcription powered by advanced AI. Edit and export transcripts with speaker identification.
              </p>
            </Card>

            {/* Recording History */}
            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-6">
                <History className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Recording History</h3>
              <p className="text-slate-600 leading-relaxed">
                Access all your recordings in one place. Download, share, and manage your content library effortlessly.
              </p>
            </Card>

            {/* High Quality Audio */}
            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mb-6">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Studio Quality Audio</h3>
              <p className="text-slate-600 leading-relaxed">
                Crystal clear audio recording with noise cancellation and automatic gain control for professional
                results.
              </p>
            </Card>

            {/* HD Video */}
            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mb-6">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">HD Video Recording</h3>
              <p className="text-slate-600 leading-relaxed">
                Record in up to 4K resolution with automatic quality adjustment based on network conditions.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple Pricing</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. Start free, upgrade anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card className="p-8 border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-slate-900 mb-6">
                  $0<span className="text-lg text-slate-600">/month</span>
                </div>
                <ul className="space-y-4 mb-8 text-left">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">Up to 2 participants</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">30 minutes per session</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">Basic transcription</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  Get Started
                </Button>
              </div>
            </Card>

            {/* Pro Plan */}
            <Card className="p-8 border-2 border-blue-500 relative hover:border-blue-600 transition-colors">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-slate-900 mb-6">
                  $19<span className="text-lg text-slate-600">/month</span>
                </div>
                <ul className="space-y-4 mb-8 text-left">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">Up to 10 participants</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">Unlimited session length</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">AI transcription with speakers</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">4K video recording</span>
                  </li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Start Pro Trial
                </Button>
              </div>
            </Card>

            {/* Enterprise Plan */}
            <Card className="p-8 border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-slate-900 mb-6">
                  $99<span className="text-lg text-slate-600">/month</span>
                </div>
                <ul className="space-y-4 mb-8 text-left">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">Unlimited participants</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">Advanced analytics</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">Custom branding</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-slate-600">Priority support</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  Contact Sales
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Mic className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold">StudioFlow</span>
              </div>
              <p className="text-slate-400">Professional recording platform for creators and teams.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; 2024 StudioFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
