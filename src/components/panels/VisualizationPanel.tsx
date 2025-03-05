/* eslint-disable */
import React, { useState, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ArrowsPointingInIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import * as THREE from 'three';
import { LoadingFacts } from './LoadingFacts';

// CSS styles for atom labels
const atomLabelStyles = `
  .atom-label {
    color: #ffffff;
    font-family: Arial, sans-serif;
    font-size: 12px;
    padding: 2px;
    background: rgba(0,0,0,0.6);
    border-radius: 3px;
    pointer-events: none;
    text-align: center;
    user-select: none;
  }
`;

// Extend Window interface to include PDBLoader and labelRenderer
declare global {
  interface Window {
    PDBLoader?: any;
    labelRenderer?: any;
    labelRendererResizeListener?: boolean;
    CSS2DRenderer?: any;
    CSS2DObject?: any;
  }
}

// Helper component to auto-fit camera to scene
const CameraController = () => {
  const { camera, scene } = useThree();
  
  useEffect(() => {
    requestAnimationFrame(() => {
      // Get all non-light objects in the scene
      const objects = scene.children.filter(child => !(child instanceof THREE.Light));
      
      if (objects.length > 0) {
        // Create bounding box for all objects
        const box = new THREE.Box3();
        objects.forEach(object => box.expandByObject(object));
        
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Calculate distance based on the diagonal of the bounding box
        const diagonal = Math.sqrt(
          size.x * size.x + 
          size.y * size.y + 
          size.z * size.z
        );
        
        // Increase the distance for larger molecules
        const scaleFactor = Math.max(1.2, Math.log10(diagonal) * 0.8);
        const distance = diagonal * scaleFactor;

        // Position camera using spherical coordinates for better viewing angle
        const theta = Math.PI / 4; // 45 degrees
        const phi = Math.PI / 6;   // 30 degrees
        
        camera.position.set(
          center.x + distance * Math.sin(theta) * Math.cos(phi),
          center.y + distance * Math.sin(phi),
          center.z + distance * Math.cos(theta) * Math.cos(phi)
        );

        // Look at the center point
        camera.lookAt(center);
        
        // Update the orbit controls target
        const controls = camera.userData.controls;
        if (controls) {
          controls.target.copy(center);
        }

        // Adjust camera's near and far planes based on molecule size
        camera.near = distance * 0.01;
        camera.far = distance * 10;
        camera.updateProjectionMatrix();
      }
    });
  }, [camera, scene]);

  return (
    <OrbitControls 
      makeDefault 
      autoRotate 
      autoRotateSpeed={1.5}
      enableDamping
      dampingFactor={0.05}
      minDistance={1} // Allow closer zoom
      maxDistance={1000} // Allow further zoom out
    />
  );
};

interface VisualizationPanelProps {
  script?: string;
  isLoading?: boolean;
  isInteractive?: boolean;
}

const DynamicSceneComponent = ({ code }: { code: string }) => {
  const { scene, camera, controls, gl: renderer } = useThree();
  
  // Effect to ensure CSS2D renderer is properly initialized
  useEffect(() => {
    // This effect runs once when the component mounts
    console.log('Component mounted, ensuring CSS2D renderer is initialized');
    
    // Add a small delay to ensure the container is fully rendered
    const initTimer = setTimeout(() => {
      const container = document.querySelector('#container');
      if (container && !window.labelRenderer) {
        console.log('Initializing CSS2D renderer on mount');
        import('three/addons/renderers/CSS2DRenderer.js')
          .then(({ CSS2DRenderer }) => {
            window.CSS2DRenderer = CSS2DRenderer;
            window.labelRenderer = new CSS2DRenderer();
            window.labelRenderer.setSize(container.clientWidth, container.clientHeight);
            window.labelRenderer.domElement.style.position = 'absolute';
            window.labelRenderer.domElement.style.top = '0px';
            window.labelRenderer.domElement.style.left = '0px';
            window.labelRenderer.domElement.style.width = '100%';
            window.labelRenderer.domElement.style.height = '100%';
            window.labelRenderer.domElement.style.pointerEvents = 'none';
            window.labelRenderer.domElement.style.zIndex = '10';
            container.appendChild(window.labelRenderer.domElement);
            console.log('CSS2D renderer initialized on mount');
          })
          .catch(error => {
            console.error('Error initializing CSS2D renderer:', error);
          });
      }
    }, 100);
    
    return () => {
      clearTimeout(initTimer);
    };
  }, []);
  
  useEffect(() => {
    async function setupScene() {
      console.log('Setting up scene with CSS2D support');
      var enableAnnotations = true;
      try {
        // Clean up everything except lights
        scene.children.slice().forEach(child => {
          if (!(child instanceof THREE.Light)) {
            scene.remove(child);
          }
        });

        // Add CSS styles for atom labels if not already present
        if (!document.getElementById('atom-label-styles')) {
          const styleElement = document.createElement('style');
          styleElement.id = 'atom-label-styles';
          styleElement.textContent = atomLabelStyles;
          document.head.appendChild(styleElement);
          console.log('Added atom label styles to document head');
        }

        // Import PDBLoader and CSS2D renderers dynamically
        console.log('Importing PDBLoader and CSS2DRenderer');
        const { PDBLoader } = await import('three/addons/loaders/PDBLoader.js');
        const { CSS2DRenderer, CSS2DObject } = await import('three/addons/renderers/CSS2DRenderer.js');
        
        // Store in window for global access
        window.PDBLoader = PDBLoader;
        window.CSS2DRenderer = CSS2DRenderer;
        window.CSS2DObject = CSS2DObject;
        
        console.log('CSS2DRenderer imported:', !!CSS2DRenderer);
        console.log('CSS2DObject imported:', !!CSS2DObject);
        
        // Set up CSS2DRenderer for labels
        const container = document.querySelector('#container');
        if (container) {
          console.log('Container found, setting up CSS2DRenderer');
          
          // Clean up existing labelRenderer if it exists
          if (window.labelRenderer) {
            try {
              container.removeChild(window.labelRenderer.domElement);
            } catch (e) {
              console.warn('Error removing existing labelRenderer:', e);
            }
            delete window.labelRenderer;
          }
          
          // Create new CSS2DRenderer
          window.labelRenderer = new CSS2DRenderer();
          window.labelRenderer.setSize(container.clientWidth, container.clientHeight);
          window.labelRenderer.domElement.style.position = 'absolute';
          window.labelRenderer.domElement.style.top = '0px';
          window.labelRenderer.domElement.style.left = '0px';
          window.labelRenderer.domElement.style.width = '100%';
          window.labelRenderer.domElement.style.height = '100%';
          window.labelRenderer.domElement.style.pointerEvents = 'none';
          window.labelRenderer.domElement.style.zIndex = '10'; // Ensure it's above the WebGL canvas
          
          // Append to container
          container.appendChild(window.labelRenderer.domElement);
          console.log('CSS2DRenderer attached to DOM');

          // Patch the renderer to include CSS2D rendering in the animation loop
          const originalRender = renderer.render;
          renderer.render = function(scene, camera) {
            originalRender.call(this, scene, camera);
            if (window.labelRenderer) {
              window.labelRenderer.render(scene, camera);
            }
          };
          console.log('Renderer patched to include CSS2D rendering');

          // Handle resize with ResizeObserver for more reliable updates
          const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
              const { width, height } = entry.contentRect;
              console.log('Container resized, updating renderers:', width, height);
              if (window.labelRenderer) {
                window.labelRenderer.setSize(width, height);
              }
              if (renderer) {
                renderer.setSize(width, height);
              }
            }
          });
          resizeObserver.observe(container);
          console.log('ResizeObserver set up for container');
        } else {
          console.error('Container not found, cannot set up CSS2DRenderer');
        }

        // Execute the visualization code
        try {
          console.log('Executing visualization code');
          
          // Create a function from the code string and execute it
          const visualizationFunction = new Function('THREE', 'scene', 'camera', 'renderer', code);
          visualizationFunction(THREE, scene, camera, renderer);
          console.log('Visualization code executed successfully');
          
          // Ensure CSS2D renderer is included in the animation loop
          ensureCss2dRendering(scene, camera, renderer);
        } catch (error) {
          console.error('Error executing visualization code:', error);
        }

      } catch (error) {
        console.error('Error setting up scene:', error);
      }
    }

    // Function to ensure CSS2D renderer is included in the animation loop
    function ensureCss2dRendering(
      scene: THREE.Scene, 
      camera: THREE.Camera, 
      renderer: THREE.WebGLRenderer & { _patchedForCss2d?: boolean }
    ) {
      if (!window.labelRenderer) {
        console.warn('labelRenderer not found, cannot set up CSS2D rendering');
        return;
      }
      
      console.log('Setting up CSS2D rendering in animation loop');
      
      // Check if the renderer's render method has already been patched
      if (renderer._patchedForCss2d) {
        console.log('Renderer already patched for CSS2D');
        return;
      }
      
      // Store the original render method
      const originalRender = renderer.render;
      
      // Replace the render method with our patched version
      renderer.render = function(scene: THREE.Scene, camera: THREE.Camera) {
        // Call the original render method
        originalRender.call(this, scene, camera);
        
        // Render the CSS2D elements
        if (window.labelRenderer) {
          window.labelRenderer.render(scene, camera);
        }
      };
      
      // Mark the renderer as patched
      renderer._patchedForCss2d = true;
      
      console.log('CSS2D rendering setup complete');
    }

    setupScene();

    // Clean up function for unmounting
    return () => {
      console.log('Cleaning up scene');
      scene.children.slice().forEach(child => {
        if (!(child instanceof THREE.Light)) {
          scene.remove(child);
        }
      });
      
      // Clean up global objects
      delete window.PDBLoader;
      delete window.CSS2DRenderer;
      delete window.CSS2DObject;
      
      // Clean up CSS2DRenderer
      const container = document.querySelector('#container');
      if (container && window.labelRenderer) {
        try {
          container.removeChild(window.labelRenderer.domElement);
        } catch (e) {
          console.warn('Error removing labelRenderer:', e);
        }
        delete window.labelRenderer;
      }
      
      // Remove atom label styles
      const styleElement = document.getElementById('atom-label-styles');
      if (styleElement) {
        styleElement.parentNode?.removeChild(styleElement);
        console.log('Removed atom label styles');
      }
    };
  }, [code, scene, camera, controls, renderer]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[1, 1, 1]} intensity={1} />
      <directionalLight position={[-1, -1, -1]} intensity={0.4} />
    </>
  );
};

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ 
  script,
  isLoading = false,
  isInteractive = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const DynamicScene = useMemo(() => {
    if (!script) return null;
      return () => <DynamicSceneComponent code={script} />;
  }, [script]);

  const handleExpand = () => {
    setIsTransitioning(true);
    setIsExpanded(!isExpanded);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // For non-interactive mode (direct geometry rendering)
  if (!isInteractive) {
    return (
      <div className="absolute inset-0">
        <div className={`transition-all duration-300 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden
          ${isExpanded ? 'fixed inset-0 z-50 m-0' : 'absolute inset-0 m-2'}`}
        >
          {/* Expand/Collapse button */}
          <button
            onClick={handleExpand}
            className="absolute top-2 right-2 z-10 p-2 text-gray-400 hover:text-white transition-colors"
            aria-label={isExpanded ? 'Collapse visualization' : 'Expand visualization'}
          >
            {isExpanded ? (
              <ArrowsPointingInIcon className="w-6 h-6" />
            ) : (
              <ArrowsPointingOutIcon className="w-6 h-6" />
            )}
          </button>

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 z-20">
              <LoadingFacts isVisible={isLoading} showFacts={true} />
            </div>
          )}

          {/* Three.js scene */}
          <div 
            id="container" 
            className="w-full h-full relative overflow-hidden"
            style={{
              boxSizing: 'border-box',
              padding: 0,
              margin: 0,
              transform: 'none',
              willChange: 'transform'
            }}
          >
            <Canvas 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%',
                transform: 'none',
                willChange: 'transform'
              }}
            >
              <CameraController />
              {DynamicScene && <DynamicScene />}
            </Canvas>
          </div>
        </div>
      </div>
    );
  }

  // For interactive mode (animation with controls)
  return (
    <div className="absolute inset-0">
      <div className={`transition-all duration-300 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden
        ${isExpanded ? 'fixed inset-0 z-50 m-0' : 'absolute inset-0 m-2'}`}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={handleExpand}
          className="absolute top-2 right-2 z-10 p-2 text-gray-400 hover:text-white transition-colors"
          aria-label={isExpanded ? 'Collapse visualization' : 'Expand visualization'}
        >
          {isExpanded ? (
            <ArrowsPointingInIcon className="w-6 h-6" />
          ) : (
            <ArrowsPointingOutIcon className="w-6 h-6" />
          )}
        </button>

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 z-20">
            <LoadingFacts isVisible={isLoading} showFacts={true} />
          </div>
        )}

        {/* Three.js scene */}
        <div 
          id="container" 
          className="w-full h-full relative overflow-hidden"
          style={{
            boxSizing: 'border-box',
            padding: 0,
            margin: 0,
            transform: 'none',
            willChange: 'transform'
          }}
        >
          <Canvas 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              transform: 'none',
              willChange: 'transform'
            }}
          >
            <CameraController />
            {DynamicScene && <DynamicScene />}
          </Canvas>
        </div>
      </div>
    </div>
  );
}; 