let culturalAudio = null;
let culturalAudioUrl = null;
// 确保在页面加载前模态窗口是隐藏的
window.onload = function() {
    document.getElementById('image-modal').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const generateBtn = document.getElementById('generate-btn');
    const imageGallery = document.getElementById('image-gallery');
    const loadingIndicator = document.getElementById('loading');
    const modal = document.getElementById('image-modal');
    const selectedImage = document.getElementById('selected-image');
    const closeBtn = document.querySelector('.close-btn');
    const downloadBtn = document.getElementById('download-btn');
    const qrcodeContainer = document.getElementById('qrcode-container');

    // API Token
    const apiToken = 'sk-cntkdkncdbyoctyxaatygqrfpodsthpfobgnxhprleamlmby';

    // Batik style placeholder images (for fallback)
    const batikPlaceholders = [
        'https://i.imgur.com/JR8ilTs.jpg',
        'https://i.imgur.com/5AKQrGD.jpg',
        'https://i.imgur.com/UPvs9xO.jpg',
        'https://i.imgur.com/8wQQFgD.jpg',
        'https://i.imgur.com/2Yz9RJf.jpg',
        'https://i.imgur.com/6VFKP9E.jpg',
        'https://i.imgur.com/JR8ilTs.jpg',  // 重复使用前面的图片以确保有8张
        'https://i.imgur.com/5AKQrGD.jpg'   // 重复使用前面的图片以确保有8张
    ];

    // 确保模态窗口在页面加载时是隐藏的
    modal.style.display = 'none';
    modal.classList.add('hidden');

    // Event Listeners
    generateBtn.addEventListener('click', generateImages);
    closeBtn.addEventListener('click', closeModal);
    downloadBtn.addEventListener('click', downloadImage);

    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Generate images based on user input
    function generateImages() {
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        imageGallery.innerHTML = '';

        // Get selected elements
        const selectedElements = Array.from(document.querySelectorAll('input[name="element"]:checked'))
            .map(checkbox => checkbox.value);

        // Get selected product
        const selectedProduct = document.querySelector('input[name="product"]:checked')?.value || '';

        // Get custom text
        const customText = document.getElementById('custom-text').value.trim();

        // Validate input
        if (selectedElements.length === 0 && customText === '') {
            alert('请选择蜡染元素或输入自定义文本');
            loadingIndicator.classList.add('hidden');
            return;
        }

        // Prepare prompt based on user input
        let prompt = '';
        if (selectedProduct) {
            prompt = `生成一张结合中国传统蜡染工艺的文创产品图，产品为${selectedProduct}`;
        }
        if (selectedElements.length > 0) {
            prompt += `，产品上的图案是一副包含${selectedElements.join('，')}蜡染元素的蜡染风格图案`;
        }
        if (customText) {
            prompt += `，产品上的图案是一副包含${customText}蜡染元素的蜡染风格图案`;
        }

        // 显示调试信息
        console.log('原始提示词:', prompt);

        // 添加错误处理和超时
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('图像生成请求超时')), 30000); // 30秒超时
        });

        // 直接用拼接的prompt生成图片
        Promise.race([
            generateBatikImages(prompt)
                .then(imageResults => {
                    // Display the generated images
                    displayGeneratedImages(imageResults);
                })
                .catch(error => {
                    console.error('Error generating images:', error);
                    // 显示错误信息
                    const errorInfo = document.createElement('div');
                    errorInfo.style.position = 'fixed';
                    errorInfo.style.top = '10px';
                    errorInfo.style.left = '10px';
                    errorInfo.style.backgroundColor = 'rgba(255,0,0,0.7)';
                    errorInfo.style.color = 'white';
                    errorInfo.style.padding = '10px';
                    errorInfo.style.zIndex = '9999';
                    errorInfo.innerHTML = `<strong>图像生成错误:</strong> ${error.message}`;
                    document.body.appendChild(errorInfo);

                    // Fallback to placeholder images if API fails
                    usePlaceholderImages();
                }),
            timeoutPromise
        ]).catch(error => {
            console.error('请求超时或发生错误:', error);
            // Fallback to placeholder images
            usePlaceholderImages();
        });
    }

    // Generate batik images using Volcano Engine Visual API
    async function generateBatikImages(prompt) {
        try {
            console.log('使用火山引擎视觉API生成蜡染风格图像...');
            console.log('提示词:', prompt);

            // 直接使用服务器代理调用火山引擎API
            if (window.generateImageWithVolcanoAPIServer) {
                try {
                    console.log('使用服务器代理调用火山引擎API...');

                    // 修改：获取完整响应对象数组
                    const serverResults = await Promise.all(
                        (await window.generateImageWithVolcanoAPIServer(prompt)).map(async (result) => {
                            // result 可能是 imageUrl 或完整响应，需兼容
                            if (typeof result === 'string') {
                                // 兼容旧返回值
                                return { url: result, llm_result: '' };
                            } else if (result && result.data && result.data.image_urls && result.data.llm_result) {
                                return { url: result.data.image_urls[0], llm_result: result.data.llm_result };
                            } else if (result && result.url && result.llm_result) {
                                return result;
                            } else {
                                // 兜底
                                return { url: '', llm_result: '' };
                            }
                        })
                    );
                    // 过滤无效项
                    const filteredResults = serverResults.filter(item => item.url);
                    console.log('成功使用服务器代理生成图像，数量:', filteredResults.length);

                    return filteredResults;
                } catch (serverError) {
                    console.error('服务器代理调用火山引擎API失败:', serverError);
                    // 显示错误信息
                    const errorInfo = document.createElement('div');
                    errorInfo.style.position = 'fixed';
                    errorInfo.style.top = '50px';
                    errorInfo.style.left = '10px';
                    errorInfo.style.backgroundColor = 'rgba(255,0,0,0.7)';
                    errorInfo.style.color = 'white';
                    errorInfo.style.padding = '10px';
                    errorInfo.style.zIndex = '9999';
                    errorInfo.style.maxWidth = '80%';
                    errorInfo.innerHTML = `<strong>火山引擎API错误:</strong> ${serverError.message}`;
                    document.body.appendChild(errorInfo);
                }
            } else {
                console.error('服务器代理未加载，请确保已引入volcano_api_server.js');
            }

            // 尝试使用备用API (siliconflow)
            console.log('尝试使用备用API (siliconflow)...');

            // 使用原始提示词，不添加额外增强
            const backupOptions = {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "model": "Kwai-Kolors/Kolors",
                    "prompt": prompt,
                    "negative_prompt": "low quality, blurry, distorted, deformed, ugly, poor details",
                    "image_size": "1024x1024",
                    "batch_size": 4,
                    "num_inference_steps": 30,
                    "guidance_scale": 7.5
                })
            };

            // 打印完整请求信息以便调试
            console.log('备用API请求URL:', 'https://api.siliconflow.cn/v1/images/generations');
            console.log('备用API请求头部:', JSON.stringify(backupOptions.headers));
            console.log('备用API请求体:', backupOptions.body);

            const backupResponse = await fetch('https://api.siliconflow.cn/v1/images/generations', backupOptions);

            if (!backupResponse.ok) {
                const errorText = await backupResponse.text();
                console.error('备用API响应状态码错误:', backupResponse.status);
                console.error('备用API错误详情:', errorText);
                throw new Error(`备用API调用也失败: ${backupResponse.status} - ${errorText}`);
            }

            const backupData = await backupResponse.json();
            console.log('备用API响应:', backupData);

            if (backupData.data && Array.isArray(backupData.data)) {
                const backupImageUrls = backupData.data.map(item => item.url || item.b64_json);
                console.log('成功使用备用API生成图像，URL数量:', backupImageUrls.length);

                if (backupImageUrls.length === 0) {
                    throw new Error('备用API未能生成图像');
                }

                // 如果生成的图片少于4张，复制已有的图片填充到4张
                let filledUrls = [...backupImageUrls];
                while (filledUrls.length < 4 && filledUrls.length > 0) {
                    const randomIndex = Math.floor(Math.random() * backupImageUrls.length);
                    filledUrls.push(backupImageUrls[randomIndex]);
                }

                return filledUrls.map(url => ({ url, llm_result: '' }));
            } else {
                throw new Error('备用API响应格式不符合预期');
            }
        } catch (error) {
            console.error('生成图像时出错:', error);

            // 显示错误信息在页面上（仅用于调试）
            const errorInfo = document.createElement('div');
            errorInfo.style.position = 'fixed';
            errorInfo.style.top = '50px';
            errorInfo.style.left = '10px';
            errorInfo.style.backgroundColor = 'rgba(255,0,0,0.7)';
            errorInfo.style.color = 'white';
            errorInfo.style.padding = '10px';
            errorInfo.style.zIndex = '9999';
            errorInfo.style.maxWidth = '80%';
            errorInfo.innerHTML = `<strong>图像生成错误:</strong> ${error.message}`;
            document.body.appendChild(errorInfo);

            throw error;
        }
    }

    // Display generated images in the gallery
    function displayGeneratedImages(imageResults) {
        imageGallery.innerHTML = '';
        if (imageResults && imageResults.length > 0) {
            const { url, llm_result } = imageResults[0];
            // Create image card
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';
            const img = document.createElement('img');
            img.src = url;
            img.alt = '蜡染风格图片';
            // Add click event to open modal，传递llm_result
            imageCard.addEventListener('click', function() {
                analyzeAndOpenModal(url, llm_result);
            });
            imageCard.appendChild(img);
            imageGallery.appendChild(imageCard);
        }
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
    }

    // Analyze image and open modal with cultural context
    async function analyzeAndOpenModal(imageUrl, llmResult) {
        // 先显示模态窗口，并显示加载状态
        selectedImage.src = imageUrl;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        // 保持模态内容区高度一致
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.minHeight = '520px'; // 可根据实际内容微调
        }

        // 布局优化：图片和按钮包裹在一个div中，图片居中，按钮在下方居中
        setTimeout(() => {
            let wrapper = document.getElementById('batik-image-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'batik-image-wrapper';
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'center';
                wrapper.style.justifyContent = 'center';
                wrapper.style.width = '100%';
                // 将图片和按钮都放到wrapper里
                const img = document.getElementById('selected-image');
                if (img && img.parentNode) {
                    img.parentNode.insertBefore(wrapper, img);
                    wrapper.appendChild(img);
                }
            }
            // 按钮
            let btn = document.getElementById('batik-culture-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'batik-culture-btn';
                btn.textContent = '你不知道的蜡染文化';
                btn.className = 'main-btn batik-culture-btn';
                btn.onclick = function() {
                    window.open('蜡染文化介绍html/page1.html', '_blank');
                };
                // 插入到图片和文化解释之间
                const img = document.getElementById('selected-image');
                const contextPlaceholder = document.getElementById('cultural-context-placeholder');
                if (img && contextPlaceholder && img.parentNode === contextPlaceholder.parentNode) {
                    img.parentNode.insertBefore(btn, contextPlaceholder);
                } else {
                    wrapper.appendChild(btn);
                }
            } else {
                btn.className = 'main-btn batik-culture-btn';
            }
        }, 100);

        // 只显示文化解释，不显示图案分析
        document.getElementById('analysis-placeholder').innerHTML = '';
        document.getElementById('cultural-context-placeholder').innerHTML = '正在生成文化解释...';
        // 移除二维码相关内容
        if (qrcodeContainer) {
            qrcodeContainer.innerHTML = '';
            qrcodeContainer.style.display = 'none';
        }

        try {
            // 只获取文化解释
            let culturalContext;
            try {
                culturalContext = await getCulturalContext(llmResult);
                document.getElementById('cultural-context-placeholder').innerHTML = `
                    <div class="analysis-container cultural-context">
                        <div class="cultural-title-row">
                            <h3 id="cultural-title">文化意义</h3>
                            <button id="tts-play-btn" class="tts-icon-btn" title="播放语音">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 10v4h4l5 5V5l-5 5H3zm13.5 2c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zm2.5 0c0 3.04-1.64 5.64-4.5 6.32v2.02c4.01-.91 7-4.49 7-8.34s-2.99-7.43-7-8.34v2.02c2.86.68 4.5 3.28 4.5 6.32z" fill="#22345a"/>
                                </svg>
                            </button>
                        </div>
                        <p>${culturalContext}</p>
                    </div>
                `;
            } catch (contextError) {
                document.getElementById('cultural-context-placeholder').innerHTML = `
                    <div class="analysis-container error">
                        <h3>文化解释错误</h3>
                        <p>文化解释请求失败: ${contextError.message}</p>
                    </div>
                `;
            }

            // 生成语音并自动播放
            await generateAndPlayCulturalAudio(culturalContext);

            // 按钮事件绑定
            const playBtn = document.getElementById('tts-play-btn');
            if (playBtn) {
                playBtn.onclick = function() {
                    if (culturalAudio) {
                        if (culturalAudio.paused) {
                            culturalAudio.play();
                            playBtn.textContent = '⏸️';
                        } else {
                            culturalAudio.pause();
                            playBtn.textContent = '🔊';
                        }
                    }
                };
            }
        } catch (error) {
            // 忽略二维码相关内容
        }
    }

    // Get cultural context using THUDM/GLM-4-32B-0414
    async function getCulturalContext(imageAnalysis) {
        console.log('开始获取文化解释，图像分析长度:', imageAnalysis ? imageAnalysis.length : 0);

        // 确保有效的图像分析文本
        const safeImageAnalysis = imageAnalysis && imageAnalysis.length > 10 ?
            imageAnalysis : '这幅蜡染风格图片包含了传统的花卉和云纹图案，色彩鲜明，具有典型的蜡染工艺特点。';

        try {
            // 修改提示词，使其更加明确和具体
            const prompt = `以下是对一幅蜡染工艺文创产品的描述：${safeImageAnalysis}，

请只详细分析描述产品图中相关的蜡染元素在中国传统蜡染工艺中的文化象征意义和寓意。请直接给出分析结果，不要重复我的问题，不要使用"根据描述"等引导语，直接用中文给出对应元素的文化解释。`;

            console.log('发送给模型的提示词长度:', prompt.length);
            console.log('提示词内容:', prompt);

            const options = {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "model": "THUDM/GLM-4-32B-0414",
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": false,
                    "max_tokens": 512,
                    "temperature": 0.7
                })
            };

            console.log('发送API请求获取文化解释...');
            console.log('发送文化解释请求到模型: THUDM/GLM-4-32B-0414');

            // 打印完整请求信息以便调试
            console.log('请求URL:', 'https://api.siliconflow.cn/v1/chat/completions');
            console.log('请求头部:', JSON.stringify(options.headers));
            console.log('请求体:', options.body);

            const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);

            // 检查响应状态
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应状态码错误:', response.status);
                console.error('API错误详情:', errorText);
                throw new Error(`文化解释 API调用失败: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('收到API响应:', data);

            // 详细记录API响应内容
            console.log('API响应完整数据:', JSON.stringify(data));

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const content = data.choices[0].message.content;
                console.log('成功获取文化解释，长度:', content.length);
                console.log('文化解释内容:', content);

                // 检查内容是否为空或只有空白字符
                if (!content || content.trim() === '') {
                    console.warn('API返回的内容为空，使用默认解释');
                    return '蜡染是中国少数民族的传统工艺，图案通常包含丰富的文化象征意义。花卉图案象征美好与繁荣，几何图案代表宇宙秩序，动物图案则传达特定的文化寓意。';
                }

                return content;
            } else {
                console.error('无效的API响应格式:', data);
                // 返回默认值而不是抛出错误
                return '蜡染是中国少数民族的传统工艺，图案通常包含丰富的文化象征意义。花卉图案象征美好与繁荣，几何图案代表宇宙秩序，动物图案则传达特定的文化寄意。';
            }
        } catch (error) {
            console.error('Error getting cultural context:', error);
            // 返回一个默认的文化解释，而不是空字符串
            const defaultContext = '蜡染是中国少数民族的传统工艺，图案通常包含丰富的文化象征意义。花卉图案象征美好与繁荣，几何图案代表宇宙秩序，动物图案则传达特定的文化寓意。';
            console.log('使用默认文化解释，长度:', defaultContext.length);
            return defaultContext;
        }
    }

    // Fallback to placeholder images if API fails
    function usePlaceholderImages() {
        // Generate 4 random images from placeholders
        for (let i = 0; i < 4; i++) {
            const randomIndex = Math.floor(Math.random() * batikPlaceholders.length);
            const imageUrl = batikPlaceholders[randomIndex];

            // Create image card
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';

            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = '蜡染风格图片';

            // Add click event to open modal
            imageCard.addEventListener('click', function() {
                openModal(imageUrl);
            });

            imageCard.appendChild(img);
            imageGallery.appendChild(imageCard);
        }

        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
    }

    // Open modal with selected image (simple version without analysis)
    function openModal(imageUrl) {
        // 直接显示模态窗口
        selectedImage.src = imageUrl;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        // 保持模态内容区高度一致
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.minHeight = '520px';
        }
        // 清空占位符内容
        document.getElementById('analysis-placeholder').innerHTML = '';
        document.getElementById('cultural-context-placeholder').innerHTML = '';
        // 移除二维码相关内容
        qrcodeContainer.innerHTML = '';
        qrcodeContainer.style.display = 'none';
    }

    // Close modal
    function closeModal() {
        console.log('Closing modal...');
        modal.classList.add('hidden');
        modal.style.display = 'none';
        // Clear selected image
        selectedImage.src = '';
        // Clear any existing analysis
        const existingAnalysis = document.querySelector('.analysis-container');
        if (existingAnalysis) {
            existingAnalysis.remove();
        }
        // 移除二维码相关内容
        qrcodeContainer.innerHTML = '';
        qrcodeContainer.style.display = 'none';

        // 新增：关闭语音播放并释放资源
        if (culturalAudio) {
            culturalAudio.pause();
            culturalAudio = null;
        }
        if (culturalAudioUrl) {
            URL.revokeObjectURL(culturalAudioUrl);
            culturalAudioUrl = null;
        }
    }

    // Download image (fetch-blob 方式，页面无变化)
    function downloadImage() {
        const imageUrl = selectedImage.src;
        fetch(imageUrl, {mode: 'cors'})
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = '你的专属蜡染文创.jpg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(() => {
                // 如果失败，回退到直接跳转（极端情况）
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = '你的专属蜡染文创.jpg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    }

    // 新增 generateAndPlayCulturalAudio 函数
    async function generateAndPlayCulturalAudio(text) {
        console.log('TTS请求已发起', text); // 调试输出
        // 释放旧音频
        if (culturalAudio) {
            culturalAudio.pause();
            culturalAudio = null;
        }
        if (culturalAudioUrl) {
            URL.revokeObjectURL(culturalAudioUrl);
            culturalAudioUrl = null;
        }
        try {
            const response = await fetch('http://localhost:3001/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (!response.ok) throw new Error('TTS请求失败');
            const audioBlob = await response.blob();
            culturalAudioUrl = URL.createObjectURL(audioBlob);
            culturalAudio = new Audio(culturalAudioUrl);
            
            // 自动播放
            let playPromise = culturalAudio.play();
            const playBtn = document.getElementById('tts-play-btn');
            if (playBtn) {
                // 按钮状态联动
                playBtn.textContent = '⏸️';
                culturalAudio.onended = () => {
                    playBtn.textContent = '🔊';
                };
                culturalAudio.onpause = () => {
                    playBtn.textContent = '🔊';
                };
                culturalAudio.onplay = () => {
                    playBtn.textContent = '⏸️';
                };
                
                // 兼容自动播放被拦截，首次点击按钮时播放
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        playBtn.textContent = '🔊';
                        playBtn.onclick = function() {
                            if (culturalAudio.paused) {
                                culturalAudio.play();
                                playBtn.textContent = '⏸️';
                            } else {
                                culturalAudio.pause();
                                playBtn.textContent = '🔊';
                            }
                        };
                    });
                }
            }
        } catch (error) {
            console.error('TTS生成失败:', error);
            const playBtn = document.getElementById('tts-play-btn');
            if (playBtn) {
                playBtn.textContent = '🔊';
                playBtn.style.opacity = '0.5';
                playBtn.style.cursor = 'not-allowed';
            }
        }
    }

    // 可选：添加样式
    const style = document.createElement('style');
    style.innerHTML = `.tts-icon-btn { background: none; border: none; font-size: 20px; cursor: pointer; outline: none; padding: 0 4px; display: flex; align-items: flex-start; margin-top: 3px; }
    .cultural-title-row { display: flex; align-items: flex-start; gap: 10px; }
    .cultural-title-row h3 { margin: 0; font-size: 1.25em; font-weight: bold; color: #22345a; }
    .tts-icon-btn svg { display: block; }
    `;
    document.head.appendChild(style);
});
