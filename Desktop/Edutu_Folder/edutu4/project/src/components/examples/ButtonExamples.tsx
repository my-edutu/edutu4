import React from 'react';
import { ExternalLink, Plus, Download, Heart, Star, ArrowRight, Play, Pause, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

/**
 * ButtonExamples - Comprehensive examples of the world-class button system
 * 
 * This component demonstrates the consistent, accessible button design
 * implemented across the Edutu app.
 */
const ButtonExamples: React.FC = () => {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Edutu Button Design System
      </h1>

      {/* Primary Use Cases */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Primary Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Apply Now - Main example */}
          <div className="p-4 border rounded-lg dark:border-gray-700">
            <h3 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
              Apply Now (Opportunities)
            </h3>
            <Button
              variant="primary"
              size="md"
              icon={<ExternalLink className="w-4 h-4" />}
              onClick={() => window.open('https://example.com/apply', '_blank')}
            >
              Apply Now
            </Button>
          </div>

          {/* Add Goal */}
          <div className="p-4 border rounded-lg dark:border-gray-700">
            <h3 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
              Add Goal
            </h3>
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => console.log('Add goal clicked')}
            >
              Add Goal
            </Button>
          </div>

          {/* Download CV */}
          <div className="p-4 border rounded-lg dark:border-gray-700">
            <h3 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
              Download Action
            </h3>
            <Button
              variant="primary"
              size="md"
              icon={<Download className="w-4 h-4" />}
              onClick={() => console.log('Download clicked')}
            >
              Download CV
            </Button>
          </div>
        </div>
      </section>

      {/* Secondary Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Secondary Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="p-4 border rounded-lg dark:border-gray-700">
            <h3 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
              Get Roadmap
            </h3>
            <Button
              variant="outline"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => console.log('Get roadmap clicked')}
            >
              Get Roadmap
            </Button>
          </div>

          <div className="p-4 border rounded-lg dark:border-gray-700">
            <h3 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
              Browse Options
            </h3>
            <Button
              variant="secondary"
              size="md"
              onClick={() => console.log('Browse clicked')}
            >
              Browse Opportunities
            </Button>
          </div>

          <div className="p-4 border rounded-lg dark:border-gray-700">
            <h3 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
              Ghost Action
            </h3>
            <Button
              variant="ghost"
              size="md"
              onClick={() => console.log('Cancel clicked')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </section>

      {/* Button Sizes */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Size Variations
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <Button variant="primary" size="xs" icon={<Plus className="w-3 h-3" />}>
            Extra Small
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="w-3 h-3" />}>
            Small
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Medium (Default)
          </Button>
          <Button variant="primary" size="lg" icon={<Plus className="w-4 h-4" />}>
            Large
          </Button>
          <Button variant="primary" size="xl" icon={<Plus className="w-5 h-5" />}>
            Extra Large
          </Button>
        </div>
      </section>

      {/* Loading States */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Loading States
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button
            variant="primary"
            size="md"
            loading={true}
            icon={<ExternalLink className="w-4 h-4" />}
          >
            Applying...
          </Button>
          <Button
            variant="secondary"
            size="md"
            loading={true}
          >
            Loading...
          </Button>
        </div>
      </section>

      {/* Icon Buttons */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Icon-Only Buttons
        </h2>
        <div className="flex flex-wrap gap-4">
          <IconButton variant="ghost" size="sm" tooltip="Like">
            <Heart className="w-4 h-4" />
          </IconButton>
          <IconButton variant="ghost" size="md" tooltip="Favorite">
            <Star className="w-4 h-4" />
          </IconButton>
          <IconButton variant="primary" size="md" tooltip="Play">
            <Play className="w-4 h-4" />
          </IconButton>
          <IconButton variant="danger" size="md" tooltip="Delete">
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </section>

      {/* Responsive Full Width */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Full Width (Mobile-Friendly)
        </h2>
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<ExternalLink className="w-4 h-4" />}
            onClick={() => console.log('Apply now clicked')}
          >
            Apply Now - Full Width
          </Button>
          <Button
            variant="outline"
            size="md"
            fullWidth
            icon={<Plus className="w-4 h-4" />}
          >
            Add to Goals - Full Width
          </Button>
        </div>
      </section>

      {/* Accessibility Features */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Accessibility Features
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium mb-2">Built-in Accessibility</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Focus ring with proper contrast</li>
              <li>• Touch-friendly 44px minimum target size</li>
              <li>• Keyboard navigation support</li>
              <li>• Screen reader compatible with aria labels</li>
              <li>• Loading states with aria-disabled</li>
              <li>• Proper color contrast ratios</li>
            </ul>
          </div>
          
          <Button
            variant="primary"
            size="md"
            disabled
            icon={<ExternalLink className="w-4 h-4" />}
          >
            Disabled State
          </Button>
        </div>
      </section>
    </div>
  );
};

export default ButtonExamples;