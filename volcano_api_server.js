// 火山引擎视觉API调用 - 服务器代理版本
async function generateImageWithVolcanoAPIServer(prompt) {
    try {
        console.log('使用SDK代理服务器调用火山引擎视觉API生成图像...');
        console.log('提示词:', prompt);

        // 直接使用原始提示词，不添加额外增强
        const enhancedPrompt = prompt;
        console.log('使用原始提示词:', enhancedPrompt);

        // 火山引擎API参数
        const requestData = {
            "req_key": "high_aes_general_v21_L",
            "prompt": enhancedPrompt,
            "req_schedule_conf": "general_v20_9B_pe",
            "llm_seed": -1,
            "seed": -1,
            "scale": 3.5,
            "ddim_steps": 25,
            "width": 512,
            "height": 512,
            "use_pre_llm": true,
            "use_sr": true,
            "return_url": true,
            "negative_prompt": "nsfw, nude, smooth skin, unblemished skin, mole, low resolution, blurry, worst quality, mutated hands and fingers, poorly drawn face, bad anatomy, distorted hands, limbless, 国旗, national flag."
        };

        // 检查代理服务器是否在运行
        try {
            // 尝试连接代理服务器
            const checkResponse = await fetch('http://localhost:5000/', {
                method: 'GET',
                mode: 'no-cors',  // 使用no-cors模式，避免CORS错误
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 2000  // 2秒超时
            }).catch(e => {
                console.warn('代理服务器连接检查失败:', e);
                return null;
            });

            if (!checkResponse) {
                console.warn('代理服务器可能未运行，请确保已启动代理服务器');
                // 显示提示信息
                const proxyWarning = document.createElement('div');
                proxyWarning.style.position = 'fixed';
                proxyWarning.style.top = '90px';
                proxyWarning.style.left = '10px';
                proxyWarning.style.backgroundColor = 'rgba(255,165,0,0.9)';
                proxyWarning.style.color = 'white';
                proxyWarning.style.padding = '10px';
                proxyWarning.style.zIndex = '9999';
                proxyWarning.style.maxWidth = '80%';
                proxyWarning.style.borderRadius = '5px';
                proxyWarning.innerHTML = `<strong>提示:</strong> 代理服务器可能未运行。请运行 start_sdk_proxy.bat 启动SDK代理服务器。`;
                document.body.appendChild(proxyWarning);

                // 5秒后自动移除提示
                setTimeout(() => {
                    try {
                        document.body.removeChild(proxyWarning);
                    } catch (e) {}
                }, 5000);
            }
        } catch (e) {
            console.warn('代理服务器检查失败:', e);
        }

        // 生成1张图片，只发起一次请求
        const imagePromises = [];
        for (let i = 0; i < 1; i++) {
            // 为每个请求使用不同的种子值
            const requestWithSeed = {
                ...requestData,
                seed: Math.floor(Math.random() * 1000000) // 随机种子
            };

            // 添加一个小延迟，避免同时发送太多请求
            const delay = i * 300; // 每个请求间隔300毫秒

            imagePromises.push(
                new Promise(resolve => setTimeout(resolve, delay))
                    .then(async () => {
                        console.log(`发送第${i+1}个图像生成请求，种子值: ${requestWithSeed.seed}...`);
                        try {
                            // 使用本地SDK代理服务器
                            const serverUrl = 'http://localhost:5000/generate-image';
                            console.log(`请求服务器: ${serverUrl}`);

                            // 添加超时处理
                            const timeoutPromise = new Promise((_, reject) => {
                                setTimeout(() => reject(new Error('服务器请求超时')), 30000); // 30秒超时
                            });

                            const fetchPromise = fetch(serverUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(requestWithSeed)
                            });

                            // 使用Promise.race来实现超时
                            const response = await Promise.race([fetchPromise, timeoutPromise]);

                            if (!response.ok) {
                                const errorText = await response.text();
                                console.error(`服务器响应状态码错误 (${response.status}):`, errorText);
                                throw new Error(`服务器调用失败 (${response.status}): ${errorText}`);
                            }

                            const result = await response.json();
                            console.log(`第${i+1}个请求响应:`, result);

                            // 检查响应状态
                            if (result.code !== 10000 || !result.data) {
                                throw new Error(`API返回错误: ${result.message || '未知错误'}`);
                            }

                            return result;
                        } catch (error) {
                            console.error(`第${i+1}个请求失败:`, error);
                            throw error;
                        }
                    })
            );
        }

        // 等待所有请求完成，忽略失败的请求
        const results = await Promise.allSettled(imagePromises);
        console.log('收到所有图像生成响应:', results);

        // 提取图片url和llm_result
        const imageResults = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const response = result.value;
                console.log(`处理第${index+1}个成功响应:`, response);
                if (response.data && response.data.image_urls && Array.isArray(response.data.image_urls) && response.data.image_urls.length > 0) {
                    const url = response.data.image_urls[0];
                    const llm_result = response.data.llm_result || '';
                    if (url) {
                        imageResults.push({ url, llm_result });
                    } else {
                        console.error(`第${index+1}个响应中没有找到图像URL`);
                    }
                } else {
                    console.error(`第${index+1}个响应格式不符合预期:`, response);
                }
            } else {
                console.error(`第${index+1}个请求失败:`, result.reason);
            }
        });

        if (imageResults.length === 0) {
            console.error('未能从API响应中提取图像URL');
            throw new Error('未能生成图像，请确保SDK代理服务器正在运行');
        }

        // 不再补齐到4张，只返回实际生成的图片
        // console.log('成功生成图像，数量:', imageResults.length);
        return imageResults;
    } catch (error) {
        console.error('SDK代理服务器API调用失败:', error);

        // 如果错误是连接相关的，给出更明确的提示
        if (error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('网络') ||
            error.message.includes('连接') ||
            error.message.includes('超时')) {
            throw new Error('无法连接到SDK代理服务器，请运行 start_sdk_proxy.bat 启动服务器');
        }

        throw error;
    }
}

// 导出函数
window.generateImageWithVolcanoAPIServer = generateImageWithVolcanoAPIServer;
