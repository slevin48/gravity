import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const FlightSimulator = () => {
  const mountRef = useRef(null);
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(500);
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [vehicle, setVehicle] = useState('plane');
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordedSamples, setRecordedSamples] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchCurrentRef = useRef({ x: 0, y: 0 });
  const speedIntervalRef = useRef(null);
  const targetSpeedRef = useRef(100);
  const recordedDataRef = useRef([]);
  const recordingStartRef = useRef(0);
  const isRecordingRef = useRef(false);

  const startRecording = () => {
    recordedDataRef.current = [];
    setRecordedSamples(0);
    setRecordingDuration(0);
    setHasRecording(false);
    recordingStartRef.current = performance.now();
    isRecordingRef.current = true;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    const totalSamples = recordedDataRef.current.length;
    setRecordedSamples(totalSamples);
    if (recordingStartRef.current) {
      const durationSeconds = (performance.now() - recordingStartRef.current) / 1000;
      setRecordingDuration(Number(durationSeconds.toFixed(1)));
    }
    setHasRecording(totalSamples > 0);
    recordingStartRef.current = 0;
  };

  const handleToggleRecording = () => {
    if (isRecordingRef.current) {
      stopRecording();
      return;
    }
    startRecording();
  };

  const handleDownloadRecording = () => {
    if (!recordedDataRef.current.length) return;

    const header = 'time_s,pos_x,pos_y,pos_z,speed_kmh,altitude_m,pitch_deg,roll_deg';
    const rows = recordedDataRef.current.map((sample) => {
      const { time, x, y, z, speedValue, altitudeValue, pitchValue, rollValue } = sample;
      return [
        time.toFixed(2),
        x.toFixed(2),
        y.toFixed(2),
        z.toFixed(2),
        speedValue.toFixed(1),
        altitudeValue.toFixed(2),
        pitchValue.toFixed(2),
        rollValue.toFixed(2)
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gravity-flight-${new Date().toISOString().replace(/[:]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isRecording) return undefined;

    const interval = setInterval(() => {
      setRecordedSamples(recordedDataRef.current.length);
      if (recordingStartRef.current) {
        const durationSeconds = (performance.now() - recordingStartRef.current) / 1000;
        setRecordingDuration(Number(durationSeconds.toFixed(1)));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {

    if (!mountRef.current) return;

    targetSpeedRef.current = 100;

    // Remove any existing children (canvas) to prevent duplicates
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 1000, 8000);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const sunlight = new THREE.DirectionalLight(0xffffff, 1);
    sunlight.position.set(100, 200, 100);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.width = 2048;
    sunlight.shadow.mapSize.height = 2048;
    scene.add(sunlight);
    scene.add(new THREE.AmbientLight(0x404040, 0.5));

    // Create vehicle models
    const createPlane = () => {
      const group = new THREE.Group();
      
      // Fuselage - long cylinder pointing forward (along Z axis)
      const fuselageGeo = new THREE.CylinderGeometry(0.6, 0.5, 6, 16);
      const bodyMat = new THREE.MeshPhongMaterial({ color: 0x2196F3, shininess: 90 });
      const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
      fuselage.rotation.x = Math.PI / 2; // Rotate to point along Z axis
      fuselage.castShadow = true;
      group.add(fuselage);

      // Nose cone
      const noseGeo = new THREE.ConeGeometry(0.6, 1.5, 16);
      const nose = new THREE.Mesh(noseGeo, bodyMat);
      nose.rotation.x = -Math.PI / 2; // Point forward
      nose.position.z = 3.75;
      nose.castShadow = true;
      group.add(nose);

      // Cockpit
      const cockpitGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const windowMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 100 });
      const cockpit = new THREE.Mesh(cockpitGeo, windowMat);
      cockpit.position.z = 2;
      cockpit.position.y = 0.4;
      cockpit.scale.set(0.8, 0.6, 1);
      group.add(cockpit);

      // Main wings (spanning left-right, X axis)
      const wingGeo = new THREE.BoxGeometry(8, 0.2, 3);
      const wing = new THREE.Mesh(wingGeo, bodyMat);
      wing.position.y = -0.2;
      wing.castShadow = true;
      group.add(wing);

      // Wing engines
      const engineGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.2, 12);
      const engineMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
      
      const engine1 = new THREE.Mesh(engineGeo, engineMat);
      engine1.position.set(2, -0.5, 0);
      group.add(engine1);
      
      const engine2 = new THREE.Mesh(engineGeo, engineMat);
      engine2.position.set(-2, -0.5, 0);
      group.add(engine2);

      // Vertical stabilizer (tail pointing up)
      const vStabGeo = new THREE.BoxGeometry(1.5, 2, 0.2);
      const vStab = new THREE.Mesh(vStabGeo, bodyMat);
      vStab.position.z = -2.5;
      vStab.position.y = 0.8;
      vStab.castShadow = true;
      group.add(vStab);

      // Horizontal stabilizers (tail wings)
      const hStabGeo = new THREE.BoxGeometry(3, 0.15, 2);
      const hStab = new THREE.Mesh(hStabGeo, bodyMat);
      hStab.position.z = -2.5;
      hStab.castShadow = true;
      group.add(hStab);

      return group;
    };

    const createWitch = () => {
      const group = new THREE.Group();
      
      // Broom stick pointing forward (along Z axis)
      const stickGeo = new THREE.CylinderGeometry(0.1, 0.15, 5, 8);
      const stickMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.rotation.x = Math.PI / 2;
      stick.castShadow = true;
      group.add(stick);

      // Broom bristles at back
      const bristleGeo = new THREE.ConeGeometry(0.4, 1.5, 8);
      const bristleMat = new THREE.MeshPhongMaterial({ color: 0xDAA520 });
      const bristles = new THREE.Mesh(bristleGeo, bristleMat);
      bristles.rotation.x = Math.PI / 2;
      bristles.position.z = -3;
      bristles.castShadow = true;
      group.add(bristles);

      // Witch body
      const bodyGeo = new THREE.ConeGeometry(0.5, 1.5, 8);
      const dressMat = new THREE.MeshPhongMaterial({ color: 0x4B0082 });
      const body = new THREE.Mesh(bodyGeo, dressMat);
      body.position.y = 1;
      body.position.z = 0.5;
      body.castShadow = true;
      group.add(body);

      // Witch head
      const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const skinMat = new THREE.MeshPhongMaterial({ color: 0x90EE90 });
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.8;
      head.position.z = 0.5;
      head.castShadow = true;
      group.add(head);

      // Witch hat
      const hatGeo = new THREE.ConeGeometry(0.5, 1.2, 8);
      const hatMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
      const hat = new THREE.Mesh(hatGeo, hatMat);
      hat.position.y = 2.6;
      hat.position.z = 0.5;
      hat.castShadow = true;
      group.add(hat);

      // Hat brim
      const brimGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.y = 2.1;
      brim.position.z = 0.5;
      group.add(brim);

      // Cape
      const capeGeo = new THREE.BoxGeometry(1.2, 1.2, 0.3);
      const capeMat = new THREE.MeshPhongMaterial({ color: 0x8B008B });
      const cape = new THREE.Mesh(capeGeo, capeMat);
      cape.position.y = 1;
      cape.position.z = 0;
      cape.rotation.z = 0.3;
      group.add(cape);

      return group;
    };

    const createXWing = () => {
      const group = new THREE.Group();
      
      // Main body pointing forward (along Z axis)
      const bodyGeo = new THREE.CylinderGeometry(0.5, 0.4, 5, 8);
      const bodyMat = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, shininess: 80 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      group.add(body);

      // Nose
      const noseGeo = new THREE.ConeGeometry(0.5, 1.2, 8);
      const nose = new THREE.Mesh(noseGeo, bodyMat);
      nose.rotation.x = -Math.PI / 2;
      nose.position.z = 3.1;
      nose.castShadow = true;
      group.add(nose);

      // Cockpit
      const cockpitGeo = new THREE.SphereGeometry(0.4, 12, 12);
      const cockpitMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 100 });
      const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
      cockpit.position.z = 1.5;
      cockpit.position.y = 0.3;
      cockpit.scale.set(0.9, 0.7, 1);
      group.add(cockpit);

      // Wing pylons
      const pylonGeo = new THREE.BoxGeometry(0.15, 1.5, 0.15);
      const wingMat = new THREE.MeshPhongMaterial({ color: 0xFF4444, shininess: 70 });
      
      // Top wings
      const topPylonRight = new THREE.Mesh(pylonGeo, wingMat);
      topPylonRight.position.set(0.5, 0, 0);
      topPylonRight.rotation.z = Math.PI / 4;
      group.add(topPylonRight);
      
      const topPylonLeft = new THREE.Mesh(pylonGeo, wingMat);
      topPylonLeft.position.set(-0.5, 0, 0);
      topPylonLeft.rotation.z = -Math.PI / 4;
      group.add(topPylonLeft);

      // Bottom wings
      const bottomPylonRight = new THREE.Mesh(pylonGeo, wingMat);
      bottomPylonRight.position.set(0.5, 0, 0);
      bottomPylonRight.rotation.z = -Math.PI / 4;
      group.add(bottomPylonRight);
      
      const bottomPylonLeft = new THREE.Mesh(pylonGeo, wingMat);
      bottomPylonLeft.position.set(-0.5, 0, 0);
      bottomPylonLeft.rotation.z = Math.PI / 4;
      group.add(bottomPylonLeft);

      // Wing panels
      const wingPanelGeo = new THREE.BoxGeometry(1.5, 0.1, 2);
      
      const wingTopR = new THREE.Mesh(wingPanelGeo, wingMat);
      wingTopR.position.set(1.5, 0, 0);
      wingTopR.castShadow = true;
      group.add(wingTopR);
      
      const wingTopL = new THREE.Mesh(wingPanelGeo, wingMat);
      wingTopL.position.set(-1.5, 0, 0);
      wingTopL.castShadow = true;
      group.add(wingTopL);

      const wingBotR = new THREE.Mesh(wingPanelGeo, wingMat);
      wingBotR.position.set(0, 1.5, 0);
      wingBotR.rotation.z = Math.PI / 2;
      wingBotR.castShadow = true;
      group.add(wingBotR);
      
      const wingBotL = new THREE.Mesh(wingPanelGeo, wingMat);
      wingBotL.position.set(0, -1.5, 0);
      wingBotL.rotation.z = Math.PI / 2;
      wingBotL.castShadow = true;
      group.add(wingBotL);

      // Engines
      const engineGeo = new THREE.CylinderGeometry(0.25, 0.3, 1, 8);
      const engineMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
      
      for (let i = 0; i < 4; i++) {
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.rotation.x = Math.PI / 2;
        const angle = (i * Math.PI) / 2;
        engine.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, -0.5);
        group.add(engine);

        // Engine glow
        const glowGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00FFFF });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.rotation.x = Math.PI / 2;
        glow.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, -1.2);
        group.add(glow);
      }

      // R2 unit
      const r2Geo = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12);
      const r2Mat = new THREE.MeshPhongMaterial({ color: 0x4444FF });
      const r2 = new THREE.Mesh(r2Geo, r2Mat);
      r2.position.z = -0.5;
      r2.position.y = 0.5;
      group.add(r2);

      return group;
    };

    const createVehicleGroup = () => {
      switch (vehicle) {
        case 'witch':
          return createWitch();
        case 'xwing':
          return createXWing();
        default:
          return createPlane();
      }
    };

    let vehicleGroup = createVehicleGroup();
    vehicleGroup.position.set(0, 500, 0);
    scene.add(vehicleGroup);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(10000, 10000, 100, 100);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a8c3a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const vertices = ground.geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i + 2] = Math.sin(vertices[i] / 100) * Math.cos(vertices[i + 1] / 100) * 50;
    }
    ground.geometry.attributes.position.needsUpdate = true;
    ground.geometry.computeVertexNormals();

    // Clouds
    const clouds = [];
    const cloudGeo = new THREE.SphereGeometry(50, 8, 8);
    const cloudMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    
    for (let i = 0; i < 50; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        Math.random() * 4000 - 2000,
        300 + Math.random() * 400,
        Math.random() * 4000 - 2000
      );
      cloud.scale.set(1 + Math.random(), 0.5 + Math.random() * 0.5, 1 + Math.random());
      clouds.push(cloud);
      scene.add(cloud);
    }

    const cameraOffset = new THREE.Vector3(0, 3, -15);
    
    const keys = {};
    let currentSpeed = 100;
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    let touchPitch = 0;
    let touchRoll = 0;

    window.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    const handleTouchStart = (e) => {
      if (e.touches.length > 0) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        touchCurrentRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        touchCurrentRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = { x: 0, y: 0 };
      touchCurrentRef.current = { x: 0, y: 0 };
    };

    if (checkMobile) {
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    const animate = () => {
      requestAnimationFrame(animate);

      if (checkMobile && touchStartRef.current.x !== 0) {
        const deltaX = (touchCurrentRef.current.x - touchStartRef.current.x) / window.innerWidth;
        const deltaY = (touchCurrentRef.current.y - touchStartRef.current.y) / window.innerHeight;
        
        touchRoll = -deltaX * 1.5;
        touchPitch = -deltaY * 1.0;
        
        vehicleGroup.rotation.z = THREE.MathUtils.clamp(touchRoll, -0.8, 0.8);
        vehicleGroup.rotation.x = THREE.MathUtils.clamp(touchPitch, -0.5, 0.5);
        
        if (Math.abs(touchRoll) > 0.1) {
          vehicleGroup.rotation.y -= touchRoll * 0.02;
        }
      } else if (!checkMobile) {
        if (keys['w']) targetSpeedRef.current = Math.min(targetSpeedRef.current + 2, 300);
        if (keys['s']) targetSpeedRef.current = Math.max(targetSpeedRef.current - 2, 50);
        
        if (keys['arrowup']) {
          vehicleGroup.rotation.x = Math.min(vehicleGroup.rotation.x + 0.01, 0.5);
        }
        if (keys['arrowdown']) {
          vehicleGroup.rotation.x = Math.max(vehicleGroup.rotation.x - 0.01, -0.5);
        }

        if (keys['arrowleft']) {
          vehicleGroup.rotation.z = Math.min(vehicleGroup.rotation.z + 0.02, 0.8);
          vehicleGroup.rotation.y += 0.015;
        } else if (keys['arrowright']) {
          vehicleGroup.rotation.z = Math.max(vehicleGroup.rotation.z - 0.02, -0.8);
          vehicleGroup.rotation.y -= 0.015;
        } else {
          vehicleGroup.rotation.z *= 0.95;
        }

        if (!keys['arrowup'] && !keys['arrowdown']) {
          vehicleGroup.rotation.x *= 0.98;
        }
      }

      currentSpeed += (targetSpeedRef.current - currentSpeed) * 0.05;

      direction.set(0, 0, 1);
      direction.applyQuaternion(vehicleGroup.quaternion);
      
      velocity.copy(direction).multiplyScalar(currentSpeed * 0.016);
      vehicleGroup.position.add(velocity);

      vehicleGroup.position.y += Math.sin(vehicleGroup.rotation.x) * currentSpeed * 0.01;
      
      if (vehicleGroup.position.y < 10) {
        vehicleGroup.position.y = 10;
        if (vehicleGroup.rotation.x < 0) vehicleGroup.rotation.x = 0;
      }

      const cameraWorldPos = cameraOffset.clone();
      cameraWorldPos.applyQuaternion(vehicleGroup.quaternion);
      camera.position.copy(vehicleGroup.position).add(cameraWorldPos);
      camera.lookAt(vehicleGroup.position);

      const currentAltitude = Math.round(vehicleGroup.position.y);
      const pitchDegrees = Math.round(vehicleGroup.rotation.x * 57.3);
      const rollDegrees = Math.round(vehicleGroup.rotation.z * 57.3);

      setSpeed(Math.round(currentSpeed));
      setAltitude(currentAltitude);
      setPitch(pitchDegrees);
      setRoll(rollDegrees);

      if (isRecordingRef.current) {
        const now = performance.now();
        const elapsedSeconds = recordingStartRef.current
          ? (now - recordingStartRef.current) / 1000
          : 0;
        recordedDataRef.current.push({
          time: elapsedSeconds,
          x: vehicleGroup.position.x,
          y: vehicleGroup.position.y,
          z: vehicleGroup.position.z,
          speedValue: currentSpeed,
          altitudeValue: vehicleGroup.position.y,
          pitchValue: THREE.MathUtils.radToDeg(vehicleGroup.rotation.x),
          rollValue: THREE.MathUtils.radToDeg(vehicleGroup.rotation.z)
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (isRecordingRef.current) {
        stopRecording();
      }
      if (checkMobile) {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      }
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [vehicle]);

  const handleVehicleChange = (newVehicle) => {
    if (isRecordingRef.current) {
      stopRecording();
    }
    setVehicle(newVehicle);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', touchAction: 'none' }}>
      <div ref={mountRef} />
      
      {/* Vehicle Selector */}
      <div style={{
        position: 'absolute',
        top: isMobile ? 10 : 20,
        right: isMobile ? 10 : 20,
        display: 'flex',
        gap: '10px',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <button
          onClick={() => handleVehicleChange('plane')}
          style={{
            padding: isMobile ? '8px 12px' : '10px 15px',
            fontSize: isMobile ? '12px' : '14px',
            background: vehicle === 'plane' ? 'rgba(33, 150, 243, 0.9)' : 'rgba(0,0,0,0.6)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ✈️ Plane
        </button>
        <button
          onClick={() => handleVehicleChange('witch')}
          style={{
            padding: isMobile ? '8px 12px' : '10px 15px',
            fontSize: isMobile ? '12px' : '14px',
            background: vehicle === 'witch' ? 'rgba(139, 0, 139, 0.9)' : 'rgba(0,0,0,0.6)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🧙 Witch
        </button>
        <button
          onClick={() => handleVehicleChange('xwing')}
          style={{
            padding: isMobile ? '8px 12px' : '10px 15px',
            fontSize: isMobile ? '12px' : '14px',
            background: vehicle === 'xwing' ? 'rgba(255, 68, 68, 0.9)' : 'rgba(0,0,0,0.6)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🚀 X-Wing
        </button>
      </div>

      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: isMobile ? 10 : 20,
        left: isMobile ? 10 : 20,
        color: 'white',
        fontFamily: 'monospace',
        fontSize: isMobile ? '14px' : '18px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        background: 'rgba(0,0,0,0.4)',
        padding: isMobile ? '10px' : '15px',
        borderRadius: '8px',
        minWidth: isMobile ? '150px' : '200px',
        pointerEvents: 'none'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Speed:</strong> {speed} km/h
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Altitude:</strong> {altitude} m
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Pitch:</strong> {pitch}°
        </div>
        <div>
          <strong>Roll:</strong> {roll}°
        </div>
      </div>

      {/* Flight Recorder */}
      <div style={{
        position: 'absolute',
        top: isMobile ? 130 : 200,
        left: isMobile ? 10 : 20,
        color: 'white',
        fontFamily: 'monospace',
        fontSize: isMobile ? '12px' : '14px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        background: 'rgba(0,0,0,0.55)',
        padding: isMobile ? '10px' : '15px',
        borderRadius: '8px',
        minWidth: '200px',
        pointerEvents: 'auto',
        border: '1px solid rgba(255,255,255,0.4)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Flight Recorder</div>
        <button
          onClick={handleToggleRecording}
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: hasRecording ? '8px' : '0',
            background: isRecording ? 'rgba(244, 67, 54, 0.9)' : 'rgba(76, 175, 80, 0.9)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {isRecording && (
          <div style={{ marginTop: '8px' }}>
            Recording • {recordedSamples} pts · {recordingDuration.toFixed(1)}s
          </div>
        )}
        {!isRecording && hasRecording && (
          <>
            <div style={{ marginBottom: '8px' }}>
              Ready to download • {recordedSamples} pts ({recordingDuration.toFixed(1)}s)
            </div>
            <button
              onClick={handleDownloadRecording}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(33, 150, 243, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Download CSV
            </button>
          </>
        )}
      </div>

      {/* Mobile Speed Controls */}
      {isMobile && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              speedIntervalRef.current = setInterval(() => {
                targetSpeedRef.current = Math.min(targetSpeedRef.current + 3, 300);
              }, 50);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (speedIntervalRef.current) {
                clearInterval(speedIntervalRef.current);
                speedIntervalRef.current = null;
              }
            }}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '24px',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'pointer',
              fontWeight: 'bold',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            +
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              speedIntervalRef.current = setInterval(() => {
                targetSpeedRef.current = Math.max(targetSpeedRef.current - 3, 50);
              }, 50);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (speedIntervalRef.current) {
                clearInterval(speedIntervalRef.current);
                speedIntervalRef.current = null;
              }
            }}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '24px',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'pointer',
              fontWeight: 'bold',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            −
          </button>
        </div>
      )}

      {/* Controls Guide */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '14px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          background: 'rgba(0,0,0,0.4)',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>CONTROLS</div>
          <div><strong>W/S:</strong> Throttle Up/Down</div>
          <div><strong>↑/↓:</strong> Pitch Up/Down</div>
          <div><strong>←/→:</strong> Roll Left/Right</div>
        </div>
      )}

      {/* Mobile Instructions */}
      {isMobile && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '12px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          background: 'rgba(0,0,0,0.4)',
          padding: '10px',
          borderRadius: '8px',
          maxWidth: '150px',
          pointerEvents: 'none'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>CONTROLS</div>
          <div>Drag screen to fly</div>
          <div>+/− for speed</div>
        </div>
      )}
    </div>
  );
};

export default FlightSimulator;
