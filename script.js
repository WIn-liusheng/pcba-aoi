class PCBAInspector {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.state = {
            standardImage: null,
            inspectionImage: null,
            cameraStream: null,
            currentCameraId: null,
            detectionResults: [],
            inspectionSettings: {
                sensitivity: 75,
                matchThreshold: 85,
                inspectionType: 'all',
                enableMarking: true,
                enableSound: true,
                autoCapture: false
            }
        };
        
        // 模拟检测数据（实际应用中应由计算机视觉算法提供）
        this.mockComponents = [
            { id: 'R1', type: 'resistor', position: { x: 100, y: 150 }, orientation: 0, polarity: null, status: 'pass' },
            { id: 'C1', type: 'capacitor', position: { x: 200, y: 150 }, orientation: 0, polarity: 'correct', status: 'pass' },
            { id: 'U1', type: 'ic', position: { x: 300, y: 150 }, orientation: 0, polarity: null, status: 'fail', issue: '方向错误' },
            { id: 'R2', type: 'resistor', position: { x: 400, y: 150 }, orientation: 0, polarity: null, status: 'warning', issue: '焊接不良' },
        ];
    }

    initializeElements() {
        // Canvas元素
        this.standardCanvas = document.getElementById('standardCanvas');
        this.inspectionCanvas = document.getElementById('inspectionCanvas');
        this.standardCtx = this.standardCanvas.getContext('2d');
        this.inspectionCtx = this.inspectionCanvas.getContext('2d');
        
        // 占位符
        this.standardPlaceholder = document.getElementById('standardPlaceholder');
        this.inspectionPlaceholder = document.getElementById('inspectionPlaceholder');
        
        // 视频元素
        this.cameraFeed = document.getElementById('cameraFeed');
        this.modalCameraFeed = document.getElementById('modalCameraFeed');
        
        // 控制元素
        this.sensitivitySlider = document.getElementById('sensitivity');
        this.matchThresholdSlider = document.getElementById('matchThreshold');
        this.inspectionTypeSelect = document.getElementById('inspectionType');
        this.enableMarkingCheckbox = document.getElementById('enableMarking');
        this.enableSoundCheckbox = document.getElementById('enableSound');
        this.autoCaptureCheckbox = document.getElementById('autoCapture');
        
        // 按钮
        this.uploadStandardBtn = document.getElementById('uploadStandard');
        this.captureStandardBtn = document.getElementById('captureStandard');
        this.clearStandardBtn = document.getElementById('clearStandard');
        this.startCameraBtn = document.getElementById('startCamera');
        this.captureInspectionBtn = document.getElementById('captureInspection');
        this.uploadInspectionBtn = document.getElementById('uploadInspection');
        this.runInspectionBtn = document.getElementById('runInspection');
        this.exportReportBtn = document.getElementById('exportReport');
        this.saveSessionBtn = document.getElementById('saveSession');
        this.loadSessionBtn = document.getElementById('loadSession');
        
        // 文件输入
        this.fileInputStandard = document.getElementById('fileInputStandard');
        this.fileInputInspection = document.getElementById('fileInputInspection');
        
        // 模态窗口
        this.cameraModal = document.getElementById('cameraModal');
        this.cameraSelect = document.getElementById('cameraSelect');
        this.confirmCameraBtn = document.getElementById('confirmCamera');
        this.closeModalBtns = document.querySelectorAll('.close-modal');
        
        // 结果显示元素
        this.resultCount = document.getElementById('resultCount');
        this.resultSolder = document.getElementById('resultSolder');
        this.resultOrientation = document.getElementById('resultOrientation');
        this.resultPolarity = document.getElementById('resultPolarity');
        this.resultOverall = document.getElementById('resultOverall');
        
        // 状态图标
        this.resultCountStatus = document.getElementById('resultCountStatus');
        this.resultSolderStatus = document.getElementById('resultSolderStatus');
        this.resultOrientationStatus = document.getElementById('resultOrientationStatus');
        this.resultPolarityStatus = document.getElementById('resultPolarityStatus');
        
        // 详情容器
        this.detectionDetails = document.getElementById('detectionDetails');
        this.clearDetailsBtn = document.getElementById('clearDetails');
        
        // 音频元素
        this.successSound = document.getElementById('successSound');
        this.errorSound = document.getElementById('errorSound');
        this.captureSound = document.getElementById('captureSound');
    }

    bindEvents() {
        // 标准样板操作
        this.uploadStandardBtn.addEventListener('click', () => this.fileInputStandard.click());
        this.captureStandardBtn.addEventListener('click', () => this.showCameraModal('standard'));
        this.clearStandardBtn.addEventListener('click', () => this.clearStandardImage());
        
        // 检测图像操作
        this.startCameraBtn.addEventListener('click', () => this.showCameraModal('inspection'));
        this.captureInspectionBtn.addEventListener('click', () => this.captureInspectionImage());
        this.uploadInspectionBtn.addEventListener('click', () => this.fileInputInspection.click());
        
        // 文件上传
        this.fileInputStandard.addEventListener('change', (e) => this.handleImageUpload(e, 'standard'));
        this.fileInputInspection.addEventListener('change', (e) => this.handleImageUpload(e, 'inspection'));
        
        // 控制面板
        this.sensitivitySlider.addEventListener('input', (e) => this.updateParameter('sensitivity', e.target.value));
        this.matchThresholdSlider.addEventListener('input', (e) => this.updateParameter('matchThreshold', e.target.value));
        this.inspectionTypeSelect.addEventListener('change', (e) => this.updateParameter('inspectionType', e.target.value));
        this.enableMarkingCheckbox.addEventListener('change', (e) => this.updateParameter('enableMarking', e.target.checked));
        this.enableSoundCheckbox.addEventListener('change', (e) => this.updateParameter('enableSound', e.target.checked));
        this.autoCaptureCheckbox.addEventListener('change', (e) => this.updateParameter('autoCapture', e.target.checked));
        
        // 检测操作
        this.runInspectionBtn.addEventListener('click', () => this.runInspection());
        this.exportReportBtn.addEventListener('click', () => this.exportReport());
        this.saveSessionBtn.addEventListener('click', () => this.saveSession());
        this.loadSessionBtn.addEventListener('click', () => this.loadSession());
        
        // 模态窗口
        this.confirmCameraBtn.addEventListener('click', () => this.confirmCameraSelection());
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        // 清除详情
        this.clearDetailsBtn.addEventListener('click', () => this.clearDetectionDetails());
        
        // 占位符点击
        this.standardPlaceholder.addEventListener('click', () => this.fileInputStandard.click());
        this.inspectionPlaceholder.addEventListener('click', () => this.showCameraModal('inspection'));
        
        // 初始化摄像头列表
        this.initializeCameraList();
        
        // 更新滑块显示值
        this.updateSliderValues();
    }

    async initializeCameraList() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            this.cameraSelect.innerHTML = '<option value="">请选择摄像头...</option>';
            videoDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `摄像头 ${this.cameraSelect.options.length}`;
                this.cameraSelect.appendChild(option);
            });
        } catch (error) {
            console.error('获取摄像头列表失败:', error);
        }
    }

    async showCameraModal(target) {
        this.currentTarget = target; // 'standard' 或 'inspection'
        this.cameraModal.classList.add('active');
        
        // 尝试获取默认摄像头预览
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            this.modalCameraFeed.srcObject = stream;
            this.modalCameraFeed.play();
        } catch (error) {
            console.error('摄像头访问失败:', error);
        }
    }

    closeModal() {
        this.cameraModal.classList.remove('active');
        if (this.modalCameraFeed.srcObject) {
            this.modalCameraFeed.srcObject.getTracks().forEach(track => track.stop());
            this.modalCameraFeed.srcObject = null;
        }
    }

    async confirmCameraSelection() {
        const deviceId = this.cameraSelect.value;
        if (!deviceId) {
            alert('请选择摄像头');
            return;
        }

        try {
            // 停止之前的流
            if (this.cameraFeed.srcObject) {
                this.cameraFeed.srcObject.getTracks().forEach(track => track.stop());
            }

            // 获取选择的摄像头
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } }
            });
            
            this.state.cameraStream = stream;
            this.currentCameraId = deviceId;
            
            if (this.currentTarget === 'inspection') {
                this.cameraFeed.srcObject = stream;
                this.cameraFeed.style.display = 'block';
                this.inspectionPlaceholder.style.display = 'none';
                this.captureInspectionBtn.disabled = false;
                document.getElementById('cameraStatus').textContent = '已开启';
                document.getElementById('cameraStatus').style.color = 'var(--success-color)';
                
                if (this.state.inspectionSettings.autoCapture) {
                    setTimeout(() => this.captureInspectionImage(), 2000);
                }
            } else {
                // 为标准样板拍摄
                this.captureStandardFromCamera(stream);
            }
            
            this.closeModal();
        } catch (error) {
            console.error('摄像头开启失败:', error);
            alert('无法访问选择的摄像头');
        }
    }

    captureStandardFromCamera(stream) {
        // 创建临时视频元素进行拍摄
        const tempVideo = document.createElement('video');
        tempVideo.srcObject = stream;
        tempVideo.play();
        
        setTimeout(() => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = tempVideo.videoWidth;
            canvas.height = tempVideo.videoHeight;
            ctx.drawImage(tempVideo, 0, 0);
            
            // 转换为图像并加载到标准样板
            const imageData = canvas.toDataURL('image/png');
            this.loadImageToCanvas(imageData, 'standard');
            
            // 停止视频流
            stream.getTracks().forEach(track => track.stop());
        }, 1000);
    }

    captureInspectionImage() {
        if (!this.cameraFeed.srcObject) return;
        
        // 播放拍摄声音
        if (this.state.inspectionSettings.enableSound) {
            this.captureSound.currentTime = 0;
            this.captureSound.play();
        }
        
        // 设置canvas尺寸
        this.inspectionCanvas.width = this.cameraFeed.videoWidth;
        this.inspectionCanvas.height = this.cameraFeed.videoHeight;
        
        // 绘制当前视频帧到canvas
        this.inspectionCtx.drawImage(this.cameraFeed, 0, 0);
        
        // 隐藏视频，显示canvas
        this.cameraFeed.style.display = 'none';
        this.inspectionCanvas.style.display = 'block';
        this.inspectionPlaceholder.style.display = 'none';
        
        // 保存图像数据
        this.state.inspectionImage = this.inspectionCanvas.toDataURL('image/png');
        
        // 更新图像信息
        this.updateImageInfo('inspection', this.inspectionCanvas.width, this.inspectionCanvas.height);
        
        // 如果启用了自动检测，立即运行检测
        if (this.state.inspectionSettings.autoCapture && this.state.standardImage) {
            setTimeout(() => this.runInspection(), 500);
        }
    }

    handleImageUpload(event, target) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            alert('请选择图像文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadImageToCanvas(e.target.result, target);
        };
        reader.readAsDataURL(file);
    }

    loadImageToCanvas(imageData, target) {
        const img = new Image();
        img.onload = () => {
            const canvas = target === 'standard' ? this.standardCanvas : this.inspectionCanvas;
            const ctx = target === 'standard' ? this.standardCtx : this.inspectionCtx;
            const placeholder = target === 'standard' ? this.standardPlaceholder : this.inspectionPlaceholder;
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            canvas.style.display = 'block';
            placeholder.style.display = 'none';
            
            // 保存图像数据
            if (target === 'standard') {
                this.state.standardImage = imageData;
            } else {
                this.state.inspectionImage = imageData;
                // 停止摄像头
                if (this.cameraFeed.srcObject) {
                    this.cameraFeed.srcObject.getTracks().forEach(track => track.stop());
                    this.cameraFeed.srcObject = null;
                    this.cameraFeed.style.display = 'none';
                    document.getElementById('cameraStatus').textContent = '已停止';
                    document.getElementById('cameraStatus').style.color = 'var(--danger-color)';
                }
            }
            
            // 更新图像信息
            this.updateImageInfo(target, img.width, img.height);
            
            // 自动检测条件
            if (target === 'inspection' && this.state.inspectionSettings.autoCapture && this.state.standardImage) {
                setTimeout(() => this.runInspection(), 500);
            }
        };
        img.src = imageData;
    }

    clearStandardImage() {
        this.standardCtx.clearRect(0, 0, this.standardCanvas.width, this.standardCanvas.height);
        this.standardCanvas.style.display = 'none';
        this.standardPlaceholder.style.display = 'flex';
        this.state.standardImage = null;
        
        document.getElementById('standardDimensions').textContent = '-';
        document.getElementById('standardComponentCount').textContent = '0';
        document.getElementById('standardTimestamp').textContent = '-';
    }

    updateImageInfo(target, width, height) {
        const dimensions = `${width} × ${height}`;
        const timestamp = new Date().toLocaleTimeString();
        
        if (target === 'standard') {
            document.getElementById('standardDimensions').textContent = dimensions;
            document.getElementById('standardComponentCount').textContent = this.mockComponents.length;
            document.getElementById('standardTimestamp').textContent = timestamp;
        } else {
            document.getElementById('inspectionResult').textContent = '等待检测';
            document.getElementById('inspectionResult').style.color = '';
        }
    }

    updateParameter(param, value) {
        this.state.inspectionSettings[param] = value;
        
        if (param === 'sensitivity') {
            document.getElementById('sensitivityValue').textContent = `${value}%`;
        } else if (param === 'matchThreshold') {
            document.getElementById('matchThresholdValue').textContent = `${value}%`;
        }
        
        this.updateSliderValues();
    }

    updateSliderValues() {
        document.getElementById('sensitivityValue').textContent = 
            `${this.state.inspectionSettings.sensitivity}%`;
        document.getElementById('matchThresholdValue').textContent = 
            `${this.state.inspectionSettings.matchThreshold}%`;
    }

    async runInspection() {
        if (!this.state.standardImage || !this.state.inspectionImage) {
            alert('请先设置标准样板和检测图像');
            return;
        }

        this.runInspectionBtn.disabled = true;
        this.runInspectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 检测中...';
        
        try {
            // 模拟检测过程
            await this.simulateDetection();
            
            // 显示检测结果
            this.displayDetectionResults();
            
            // 在图像上绘制标记
            if (this.state.inspectionSettings.enableMarking) {
                this.drawMarkings();
            }
            
            // 播放提示音
            if (this.state.inspectionSettings.enableSound) {
                const overallPass = this.state.detectionResults.every(r => r.status === 'pass');
                if (overallPass) {
                    this.successSound.currentTime = 0;
                    this.successSound.play();
                } else {
                    this.errorSound.currentTime = 0;
                    this.errorSound.play();
                }
            }
            
        } catch (error) {
            console.error('检测过程出错:', error);
            alert('检测过程中出现错误');
        } finally {
            this.runInspectionBtn.disabled = false;
            this.runInspectionBtn.innerHTML = '<i class="fas fa-play"></i> 开始比对检测';
        }
    }

    simulateDetection() {
        return new Promise((resolve) => {
            // 模拟检测时间
            setTimeout(() => {
                // 生成模拟检测结果
                this.state.detectionResults = this.mockComponents.map(comp => {
                    let details = '';
                    let status = comp.status;
                    
                    if (status === 'pass') {
                        details = `${comp.id} - ${comp.type} 检测通过`;
                    } else if (status === 'fail') {
                        details = `${comp.id} - ${comp.type} ${comp.issue}`;
                    } else if (status === 'warning') {
                        details = `${comp.id} - ${comp.type} ${comp.issue}`;
                    }
                    
                    return {
                        id: comp.id,
                        type: comp.type,
                        position: comp.position,
                        status: status,
                        details: details,
                        confidence: Math.floor(Math.random() * 20) + 80 // 80-100% 置信度
                    };
                });
                
                resolve();
            }, 1500); // 1.5秒模拟检测时间
        });
    }

    displayDetectionResults() {
        // 清空之前的详情
        this.detectionDetails.innerHTML = '';
        
        let passCount = 0;
        let failCount = 0;
        let warningCount = 0;
        
        // 添加检测结果到详情面板
        this.state.detectionResults.forEach(result => {
            const item = document.createElement('div');
            item.className = `detection-item ${result.status}`;
            
            item.innerHTML = `
                <div class="detection-header">
                    <span class="detection-title">${result.id} (${result.type})</span>
                    <span class="detection-status ${result.status}">
                        ${result.status === 'pass' ? '通过' : result.status === 'fail' ? '失败' : '警告'}
                    </span>
                </div>
                <div class="detection-details">
                    ${result.details}
                    <div style="margin-top: 5px; font-size: 0.85rem; color: #999;">
                        置信度: ${result.confidence}%
                    </div>
                </div>
            `;
            
            this.detectionDetails.appendChild(item);
            
            if (result.status === 'pass') passCount++;
            else if (result.status === 'fail') failCount++;
            else if (result.status === 'warning') warningCount++;
        });
        
        // 更新统计结果
        const totalComponents = this.state.detectionResults.length;
        const detectedComponents = totalComponents;
        
        // 元件数量结果
        this.resultCount.textContent = `${detectedComponents}/${totalComponents}`;
        this.resultCountStatus.className = 'status-icon ' + 
            (detectedComponents === totalComponents ? 'pass' : 'fail');
        
        // 焊接质量结果
        const solderPass = warningCount === 0;
        this.resultSolder.textContent = solderPass ? '良好' : '需检查';
        this.resultSolderStatus.className = 'status-icon ' + (solderPass ? 'pass' : 'fail');
        
        // 元件方向结果
        const orientationPass = failCount === 0;
        this.resultOrientation.textContent = orientationPass ? '正确' : '有错误';
        this.resultOrientationStatus.className = 'status-icon ' + (orientationPass ? 'pass' : 'fail');
        
        // 极性检查结果
        const polarityPass = true; // 模拟结果
        this.resultPolarity.textContent = polarityPass ? '正确' : '错误';
        this.resultPolarityStatus.className = 'status-icon ' + (polarityPass ? 'pass' : 'fail');
        
        // 总体结果
        const overallPass = failCount === 0;
        this.resultOverall.textContent = overallPass ? '通过' : '失败';
        this.resultOverall.className = `result-value overall ${overallPass ? 'pass' : 'fail'}`;
        this.resultOverall.style.color = overallPass ? 'var(--success-color)' : 'var(--danger-color)';
        
        // 更新检测结果状态
        const overallText = overallPass ? '检测通过' : '检测失败';
        document.getElementById('inspectionResult').textContent = overallText;
        document.getElementById('inspectionResult').style.color = overallPass ? 
            'var(--success-color)' : 'var(--danger-color)';
        
        // 更新置信度
        const avgConfidence = Math.round(
            this.state.detectionResults.reduce((sum, r) => sum + r.confidence, 0) / totalComponents
        );
        document.getElementById('confidenceLevel').textContent = `${avgConfidence}%`;
        document.getElementById('confidenceLevel').style.color = avgConfidence >= 90 ? 
            'var(--success-color)' : avgConfidence >= 80 ? 'var(--warning-color)' : 'var(--danger-color)';
        
        // 如果没有检测结果，显示空状态
        if (this.state.detectionResults.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-details';
            emptyDiv.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <p>检测结果将显示在这里</p>
            `;
            this.detectionDetails.appendChild(emptyDiv);
        }
    }

    drawMarkings() {
        // 清除之前的标记
        this.inspectionCtx.clearRect(0, 0, this.inspectionCanvas.width, this.inspectionCanvas.height);
        
        // 重新绘制图像
        const img = new Image();
        img.onload = () => {
            this.inspectionCtx.drawImage(img, 0, 0);
            
            // 绘制标记框
            this.state.detectionResults.forEach(result => {
                const { x, y } = result.position;
                const boxSize = 50;
                
                // 计算缩放比例（假设图像已适应显示）
                const scaleX = this.inspectionCanvas.width / img.width;
                const scaleY = this.inspectionCanvas.height / img.height;
                const scaledX = x * scaleX;
                const scaledY = y * scaleY;
                const scaledSize = boxSize * Math.min(scaleX, scaleY);
                
                // 创建标记框元素
                const markingBox = document.createElement('div');
                markingBox.className = `marking-box ${result.status}`;
                markingBox.style.left = `${scaledX - scaledSize/2}px`;
                markingBox.style.top = `${scaledY - scaledSize/2}px`;
                markingBox.style.width = `${scaledSize}px`;
                markingBox.style.height = `${scaledSize}px`;
                
                const markingLabel = document.createElement('div');
                markingLabel.className = `marking-label ${result.status}`;
                markingLabel.textContent = result.id;
                markingLabel.style.left = `${scaledX - scaledSize/2}px`;
                markingLabel.style.top = `${scaledY - scaledSize/2 - 25}px`;
                
                // 添加到图像容器
                const imageContainer = document.querySelector('.inspection-panel .image-container');
                imageContainer.appendChild(markingBox);
                imageContainer.appendChild(markingLabel);
            });
        };
        img.src = this.state.inspectionImage;
    }

    exportReport() {
        if (this.state.detectionResults.length === 0) {
            alert('请先运行检测');
            return;
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            standardImage: this.state.standardImage ? '已设置' : '未设置',
            inspectionImage: this.state.inspectionImage ? '已设置' : '未设置',
            settings: this.state.inspectionSettings,
            results: this.state.detectionResults,
            summary: {
                totalComponents: this.state.detectionResults.length,
                passCount: this.state.detectionResults.filter(r => r.status === 'pass').length,
                failCount: this.state.detectionResults.filter(r => r.status === 'fail').length,
                warningCount: this.state.detectionResults.filter(r => r.status === 'warning').length
            }
        };
        
        // 创建报告文本
        const reportText = `PCBA AOI检测报告
=============================
检测时间: ${new Date(report.timestamp).toLocaleString()}
检测设置: ${JSON.stringify(report.settings, null, 2)}
检测结果汇总:
  总元件数: ${report.summary.totalComponents}
  通过: ${report.summary.passCount}
  失败: ${report.summary.failCount}
  警告: ${report.summary.warningCount}

详细检测结果:
${report.results.map(r => `  ${r.id}: ${r.status} - ${r.details}`).join('\n')}
`;
        
        // 创建下载链接
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pcba_inspection_report_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('报告已导出');
    }

    saveSession() {
        const sessionData = {
            standardImage: this.state.standardImage,
            inspectionImage: this.state.inspectionImage,
            detectionResults: this.state.detectionResults,
            inspectionSettings: this.state.inspectionSettings,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('pcbaInspectorSession', JSON.stringify(sessionData));
        alert('会话已保存');
    }

    loadSession() {
        const savedSession = localStorage.getItem('pcbaInspectorSession');
        if (!savedSession) {
            alert('没有找到保存的会话');
            return;
        }
        
        try {
            const sessionData = JSON.parse(savedSession);
            
            // 恢复设置
            this.state.inspectionSettings = sessionData.inspectionSettings;
            
            // 更新UI设置
            this.sensitivitySlider.value = this.state.inspectionSettings.sensitivity;
            this.matchThresholdSlider.value = this.state.inspectionSettings.matchThreshold;
            this.inspectionTypeSelect.value = this.state.inspectionSettings.inspectionType;
            this.enableMarkingCheckbox.checked = this.state.inspectionSettings.enableMarking;
            this.enableSoundCheckbox.checked = this.state.inspectionSettings.enableSound;
            this.autoCaptureCheckbox.checked = this.state.inspectionSettings.autoCapture;
            
            this.updateSliderValues();
            
            // 恢复图像
            if (sessionData.standardImage) {
                this.loadImageToCanvas(sessionData.standardImage, 'standard');
            }
            
            if (sessionData.inspectionImage) {
                this.loadImageToCanvas(sessionData.inspectionImage, 'inspection');
            }
            
            // 恢复检测结果
            if (sessionData.detectionResults) {
                this.state.detectionResults = sessionData.detectionResults;
                this.displayDetectionResults();
            }
            
            alert('会话已加载');
        } catch (error) {
            console.error('加载会话失败:', error);
            alert('加载会话时出错');
        }
    }

    clearDetectionDetails() {
        this.detectionDetails.innerHTML = `
            <div class="empty-details">
                <i class="fas fa-info-circle"></i>
                <p>检测结果将显示在这里</p>
            </div>
        `;
        
        // 清除图像上的标记
        const imageContainer = document.querySelector('.inspection-panel .image-container');
        const markings = imageContainer.querySelectorAll('.marking-box, .marking-label');
        markings.forEach(marking => marking.remove());
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const inspector = new PCBAInspector();
    window.pcbaInspector = inspector; // 暴露到全局便于调试
});