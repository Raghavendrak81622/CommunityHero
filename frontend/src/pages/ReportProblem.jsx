import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProblem } from '../hooks/useCreateProblem';
import { CATEGORIES, getCategoryConfig } from '../utils/categories';
import { 
  AlertCircle, 
  ArrowLeft, 
  Upload, 
  ChevronRight, 
  Map, 
  Navigation, 
  X,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportProblem() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const { createProblem, loading: isCreating } = useCreateProblem();
  
  // Form input states
  const [formData, setFormData] = useState({
    title: '',
    category: 'Roads & Potholes',
    severity: 'Medium',
    location: '',
    pincode: '',
    description: '',
  });

  // Searchable category dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // GPS geolocation states
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsData, setGpsData] = useState({ latitude: null, longitude: null });

  // Cloudinary image states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [localError, setLocalError] = useState('');

  // Close category dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (localError) setLocalError('');
  };

  // Browser Geolocation API capture
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGpsLoading(false);
        toast.success(`GPS coordinates captured!`);
      },
      (error) => {
        console.error("GPS error:", error);
        setGpsLoading(false);
        toast.error(error.message || "Failed to retrieve current location.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Drag & drop file handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cloudinary client-side upload handler (unsigned preset)
  const uploadImageToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary credentials are not configured in environment variables.");
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: uploadData
    });

    if (!response.ok) {
      const errResponse = await response.json();
      throw new Error(errResponse.error?.message || "Cloudinary upload failed.");
    }

    const resJson = await response.json();
    return resJson.secure_url;
  };

  // Compress image locally using canvas to fit within Firestore document limits (<1MB)
  const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!formData.title.trim()) {
      setLocalError('Please provide a short, descriptive title for the issue.');
      return;
    }
    if (!formData.location.trim()) {
      setLocalError('Please specify the location or nearest intersection.');
      return;
    }
    if (!formData.pincode.trim()) {
      setLocalError('Pincode is required.');
      return;
    }
    if (!/^\d{6}$/.test(formData.pincode)) {
      setLocalError('Pincode must be exactly 6 digits.');
      return;
    }
    if (!formData.description.trim()) {
      setLocalError('Please describe the problem details.');
      return;
    }

    setLocalError('');
    let uploadedUrl = '';

    try {
      // 1. Upload file if selected
      if (imageFile) {
        setUploadingImage(true);
        try {
          uploadedUrl = await uploadImageToCloudinary(imageFile);
        } catch (uploadErr) {
          console.warn("Cloudinary upload failed, compressing image locally for Firestore storage:", uploadErr);
          try {
            uploadedUrl = await compressImageToBase64(imageFile);
          } catch (compressErr) {
            console.error("Local compression failed:", compressErr);
            toast.error("Could not process photo. Submitting with default image.");
            uploadedUrl = "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=800&q=80";
          }
        }
        setUploadingImage(false);
      }

      // 2. Format payload for Firestore CRUD service
      const payload = {
        title: formData.title,
        category: formData.category,
        severity: formData.severity,
        location: formData.location,
        pincode: formData.pincode,
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        description: formData.description,
        imageUrl: uploadedUrl
      };

      // 3. Create document in Firestore
      await createProblem(payload);

      // 4. Reset Form state
      setFormData({
        title: '',
        category: 'Roads & Potholes',
        severity: 'Medium',
        location: '',
        pincode: '',
        description: '',
      });
      setGpsData({ latitude: null, longitude: null });
      setImageFile(null);
      setImagePreview('');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      navigate('/');
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err.message || "Failed to submit report. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const isWorking = isCreating || uploadingImage;

  // Filter categories dynamically based on query
  const filteredCategories = CATEGORIES.filter(cat => 
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Selected category config for displaying icon
  const selectedCatConfig = getCategoryConfig(formData.category);
  const SelectedCatIcon = selectedCatConfig.icon;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 flex-grow">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        disabled={isWorking}
        className="inline-flex items-center text-sm font-semibold text-zinc-500 hover:text-zinc-950 mb-6 group transition-colors cursor-pointer disabled:opacity-50"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </button>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-950 mb-2 font-display">Report a Community Problem</h1>
        <p className="text-zinc-500 text-sm">
          Provide location coordinates, postal codes, descriptions, and photo previews to direct municipal repair crews.
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {localError && (
          <div className="flex items-start space-x-2.5 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm text-left">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2 text-left">
          <label htmlFor="title" className="block text-sm font-semibold text-zinc-700">
            Issue Title <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            disabled={isWorking}
            placeholder="e.g., Damaged curb and sidewalk pooling water"
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-zinc-400 text-zinc-950 placeholder-zinc-400 text-sm focus:outline-none transition-colors disabled:opacity-50"
          />
        </div>

        {/* Grid for Category & Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Custom Searchable Category Dropdown */}
          <div className="space-y-2 relative text-left" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-zinc-700">
              Category
            </label>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 hover:bg-zinc-100 text-sm focus:outline-none transition-all cursor-pointer disabled:opacity-50 text-left"
            >
              <span className="flex items-center space-x-2.5">
                <SelectedCatIcon className={`h-4.5 w-4.5 ${selectedCatConfig.text}`} />
                <span className="truncate">{formData.category}</span>
              </span>
              <ChevronRight className={`h-4 w-4 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-90' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                {/* Search Bar */}
                <div className="p-2 border-b border-zinc-150 flex items-center space-x-2 bg-zinc-50">
                   <Search className="h-4 w-4 text-zinc-450 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none"
                    autoFocus
                  />
                </div>
                
                {/* Options List */}
                <ul className="max-h-56 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                  {filteredCategories.length === 0 ? (
                    <li className="px-3 py-3 text-xs text-zinc-400 text-center">No categories match search</li>
                  ) : (
                    filteredCategories.map((cat) => {
                      const catConfig = getCategoryConfig(cat);
                      const CatIcon = catConfig.icon;
                      const isSelected = formData.category === cat;
                      return (
                        <li key={cat}>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, category: cat }));
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer border-none bg-white ${
                              isSelected
                                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                                : 'text-zinc-650 hover:bg-zinc-550/10 hover:text-zinc-950'
                            }`}
                          >
                            <CatIcon className={`h-4 w-4 shrink-0 ${catConfig.text}`} />
                            <span className="truncate">{cat}</span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Severity */}
          <div className="space-y-2 text-left">
            <label htmlFor="severity" className="block text-sm font-semibold text-zinc-700">
              Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={isWorking}
                  onClick={() => setFormData((prev) => ({ ...prev, severity: level }))}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    formData.severity === level
                      ? level === 'High'
                        ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                        : level === 'Medium'
                        ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-700 font-bold'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  } disabled:opacity-50`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location & Pincode Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {/* Location Description */}
          <div className="sm:col-span-2 space-y-2">
            <label htmlFor="location" className="block text-sm font-semibold text-zinc-700">
              Location Description / Address <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              disabled={isWorking}
              placeholder="e.g., Near main gate at 4th Ave and Elm St"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-zinc-400 text-zinc-950 placeholder-zinc-400 text-sm focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Pincode Field */}
          <div className="space-y-2">
            <label htmlFor="pincode" className="block text-sm font-semibold text-zinc-700">
              Pincode <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              id="pincode"
              name="pincode"
              maxLength="6"
              value={formData.pincode}
              onChange={handleInputChange}
              disabled={isWorking}
              placeholder="6-digit PIN"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-zinc-400 text-zinc-950 placeholder-zinc-400 text-sm focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Geolocation Coordinate Capture */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-xs font-bold text-zinc-800 flex items-center">
                <Map className="h-3.5 w-3.5 text-zinc-900 mr-1.5" />
                <span>Geotag Coordinates (Optional)</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Captures coordinates from browser geolocation API.</p>
            </div>
            
            <button
              type="button"
              onClick={handleGetGps}
              disabled={isWorking || gpsLoading}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-zinc-800 text-xs font-bold transition-colors cursor-pointer hover:bg-zinc-100 disabled:opacity-50 shrink-0"
            >
              <Navigation className={`h-3 w-3 ${gpsLoading ? 'animate-bounce' : ''}`} />
              <span>{gpsLoading ? 'Locating...' : 'Get GPS Coordinates'}</span>
            </button>
          </div>

          {/* Captured Coord Display */}
          {(gpsData.latitude !== null && gpsData.longitude !== null) && (
            <div className="pt-2 border-t border-zinc-200 flex space-x-6 text-[10px] font-mono text-zinc-650">
              <span>Latitude: <strong className="text-zinc-950 font-bold">{gpsData.latitude.toFixed(6)}</strong></span>
              <span>Longitude: <strong className="text-zinc-950 font-bold">{gpsData.longitude.toFixed(6)}</strong></span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2 text-left">
          <label htmlFor="description" className="block text-sm font-semibold text-zinc-700">
            Problem Details <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows="4"
            value={formData.description}
            onChange={handleInputChange}
            disabled={isWorking}
            placeholder="Describe the issue in detail. If applicable, mention who is affected, how long it has been present, and any immediate safety hazards..."
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-zinc-400 text-zinc-950 placeholder-zinc-400 text-sm focus:outline-none transition-colors resize-none disabled:opacity-50"
          />
        </div>

        {/* Cloudinary Image Selector & Preview */}
        <div className="space-y-2 text-left">
          <label className="block text-sm font-semibold text-zinc-700">
            Upload Photo (Optional)
          </label>
          
          <input
            type="file"
            ref={fileInputRef}
            id="image-file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isWorking}
            className="hidden"
          />

          {imagePreview ? (
            /* Selected File Preview Box */
            <div className="relative border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={imagePreview}
                  alt="Upload Preview"
                  className="w-14 h-14 rounded-lg object-cover border border-zinc-200 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 truncate max-w-[200px] sm:max-w-[400px]">
                    {imageFile?.name || 'Selected Image'}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {imageFile ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={removeSelectedImage}
                disabled={isWorking}
                className="p-1.5 rounded-full bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
                title="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Dropzone selector box */
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border border-dashed border-zinc-300 hover:border-zinc-400 rounded-xl p-6 bg-zinc-50 hover:bg-zinc-100/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
            >
              <Upload className="h-8 w-8 text-zinc-950 mb-3 group-hover:-translate-y-0.5 transition-transform" />
              <p className="text-sm font-semibold text-zinc-700">Drag and drop image here, or click to upload</p>
              <p className="text-xs text-zinc-450 mt-1">Supports PNG, JPG, or JPEG up to 10MB</p>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isWorking}
            className={`w-full inline-flex items-center justify-center py-3.5 px-4 rounded-full text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800 transition-all cursor-pointer shadow-sm ${
              isWorking ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {uploadingImage ? 'Uploading Image to Cloudinary...' : isCreating ? 'Submitting Report...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
