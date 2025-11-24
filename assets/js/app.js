// GitHub Pages 看板 JavaScript

// 全局变量
let mapInstance = null;
let locationsData = null;

// 数据加载
async function loadData() {
    try {
        const [projects, teams, progress, board, locations] = await Promise.all([
            fetch('data/projects.json').then(r => r.json()).catch(() => ({ projects: [] })),
            fetch('data/teams.json').then(r => r.json()).catch(() => ({ teams: [] })),
            fetch('data/progress.json').then(r => r.json()).catch(() => ({})),
            fetch('data/board.json').then(r => r.json()).catch(() => ({ columns: [] })),
            fetch('data/locations.json').then(r => r.json()).catch(() => ({ locations: [] }))
        ]);
        
        locationsData = locations;
        renderBoard(board);
        renderProjects(projects);
        renderTeams(teams);
        loadBlogPosts();
    } catch (error) {
        console.error('加载数据失败:', error);
        showError('加载数据失败，请检查网络连接');
    }
}

// 看板渲染
function renderBoard(boardData) {
    const container = document.getElementById('board-container');
    if (!container) return;
    
    if (!boardData.columns || boardData.columns.length === 0) {
        container.innerHTML = '<div class="loading">暂无看板数据，请在 GitHub 编辑 data/board.json</div>';
        return;
    }
    
    container.innerHTML = '';
    
    boardData.columns.forEach(column => {
        const columnEl = document.createElement('div');
        columnEl.className = 'board-column';
        columnEl.innerHTML = `
            <h3>${column.name}</h3>
            <div class="cards" data-column="${column.id}">
                ${column.cards && column.cards.length > 0 
                    ? column.cards.map(card => renderCard(card)).join('')
                    : '<div class="empty-state">暂无任务</div>'
                }
            </div>
        `;
        container.appendChild(columnEl);
    });
}

// 卡片渲染
function renderCard(card) {
    return `
        <div class="card" data-id="${card.id}">
            <h4>${escapeHtml(card.title || '无标题')}</h4>
            ${card.description ? `<p>${escapeHtml(card.description)}</p>` : ''}
            ${card.label ? `<span class="badge">${escapeHtml(card.label)}</span>` : ''}
            ${card.assignee ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">👤 ${escapeHtml(card.assignee)}</div>` : ''}
            ${card.dueDate ? `<div style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">📅 ${escapeHtml(card.dueDate)}</div>` : ''}
        </div>
    `;
}

// 项目渲染
function renderProjects(projectsData) {
    const container = document.getElementById('projects-grid');
    if (!container) return;
    
    if (!projectsData.projects || projectsData.projects.length === 0) {
        container.innerHTML = '<div class="loading">暂无项目数据</div>';
        return;
    }
    
    container.innerHTML = projectsData.projects.map(project => `
        <div class="project-card">
            <h3>${escapeHtml(project.name || '未命名项目')}</h3>
            <span class="status ${project.status || 'pending'}">${getStatusText(project.status)}</span>
            <p style="margin-top: 12px; color: var(--text-secondary);">${escapeHtml(project.description || '')}</p>
            ${project.progress !== undefined ? `
                <div style="margin-top: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="font-size: 12px; color: var(--text-secondary);">进度</span>
                        <span style="font-size: 12px; color: var(--text-secondary);">${project.progress}%</span>
                    </div>
                    <div style="height: 4px; background: var(--surface); border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; width: ${project.progress}%; background: var(--text); transition: width 0.3s;"></div>
                    </div>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 团队渲染
function renderTeams(teamsData) {
    const container = document.getElementById('teams-container');
    if (!container) return;
    
    if (!teamsData.teams || teamsData.teams.length === 0) {
        container.innerHTML = '<div class="loading">暂无团队数据</div>';
        return;
    }
    
    container.innerHTML = teamsData.teams.map(team => `
        <div class="team-card">
            <h3>${escapeHtml(team.name || '未命名团队')}</h3>
            <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">${escapeHtml(team.description || '')}</p>
            ${team.members && team.members.length > 0 
                ? team.members.map(member => `
                    <div class="member-item">
                        <div class="name">${escapeHtml(member.name || '未知')}</div>
                        <div class="role">${escapeHtml(member.role || '')}</div>
                    </div>
                `).join('')
                : '<div style="color: var(--text-secondary); font-size: 14px;">暂无成员</div>'
            }
        </div>
    `).join('');
}

// 博客加载
async function loadBlogPosts() {
    const container = document.getElementById('blog-list');
    if (!container) return;
    
    try {
        // 尝试加载博客索引
        const index = await fetch('content/posts/index.json').then(r => r.json()).catch(() => ({ posts: [] }));
        
        if (!index.posts || index.posts.length === 0) {
            container.innerHTML = '<div class="loading">暂无博客文章，在 content/posts/ 目录创建 Markdown 文件即可发布</div>';
            return;
        }
        
        // 加载每篇文章
        const posts = await Promise.all(
            index.posts.slice(0, 10).map(async post => {
                try {
                    const content = await fetch(`content/posts/${post.file}`).then(r => r.text());
                    return { ...post, content };
                } catch {
                    return { ...post, content: '' };
                }
            })
        );
        
        container.innerHTML = posts.map(post => {
            const html = post.content ? marked.parse(post.content) : '';
            return `
                <article class="blog-post">
                    <h3>${escapeHtml(post.title || '无标题')}</h3>
                    <time>${escapeHtml(post.date || '')}</time>
                    ${post.author ? `<div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">作者: ${escapeHtml(post.author)}</div>` : ''}
                    <div class="content">${html}</div>
                </article>
            `;
        }).join('');
        
        // 高亮代码块（如果有 highlight.js）
        if (typeof hljs !== 'undefined') {
            container.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    } catch (error) {
        console.error('加载博客失败:', error);
        container.innerHTML = '<div class="loading">加载博客失败</div>';
    }
}

// 地图渲染
function renderMap() {
    const container = document.getElementById('map-container');
    if (!container) return;
    
    // 如果地图已初始化，先销毁
    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }
    
    if (!locationsData || !locationsData.locations || locationsData.locations.length === 0) {
        container.innerHTML = '<div class="loading">暂无位置数据，请在 GitHub 编辑 data/locations.json</div>';
        return;
    }
    
    // 初始化地图（中国中心）
    mapInstance = L.map('map-container').setView([31.0, 120.0], 6);
    
    // 添加地图图层（使用 OpenStreetMap）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(mapInstance);
    
    // 添加标记点
    const bounds = [];
    locationsData.locations.forEach(location => {
        if (location.coordinates && location.coordinates.length === 2) {
            const [lat, lng] = location.coordinates;
            bounds.push([lat, lng]);
            
            // 创建自定义图标
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    background: var(--text);
                    color: white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${location.icon || '📍'}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            // 创建弹出窗口内容
            const popupContent = `
                <div style="min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${escapeHtml(location.name)}</h3>
                    <p style="margin: 0 0 4px 0; color: var(--text-secondary); font-size: 14px;">${escapeHtml(location.role)}</p>
                    <p style="margin: 0 0 4px 0; color: var(--text-secondary); font-size: 12px;">📍 ${escapeHtml(location.location)}</p>
                    ${location.timezone ? `<p style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 11px;">🕐 ${escapeHtml(location.timezone)}</p>` : ''}
                    ${location.description ? `<p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.5;">${escapeHtml(location.description)}</p>` : ''}
                </div>
            `;
            
            // 添加标记
            const marker = L.marker([lat, lng], { icon: icon })
                .addTo(mapInstance)
                .bindPopup(popupContent);
        }
    });
    
    // 调整地图视图以包含所有标记
    if (bounds.length > 0) {
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
    }
    
    // 渲染图例
    renderMapLegend();
}

// 地图图例
function renderMapLegend() {
    const legendContainer = document.getElementById('map-legend');
    if (!legendContainer || !locationsData) return;
    
    legendContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
            ${locationsData.locations.map(location => `
                <div style="
                    background: var(--card-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="
                        font-size: 24px;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: var(--surface);
                        border-radius: 50%;
                    ">${location.icon || '📍'}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(location.name)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">📍 ${escapeHtml(location.location)}</div>
                        ${location.timezone ? `<div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">🕐 ${escapeHtml(location.timezone)}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 标签页切换
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // 更新标签状态
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 更新内容显示
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                    // 如果切换到地图标签，初始化地图
                    if (targetTab === 'map' && typeof L !== 'undefined') {
                        setTimeout(() => renderMap(), 100);
                    }
                }
            });
        });
    });
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusText(status) {
    const statusMap = {
        'in_progress': '进行中',
        'completed': '已完成',
        'pending': '待开始',
        'paused': '已暂停'
    };
    return statusMap[status] || status || '未知';
}

function showError(message) {
    const container = document.querySelector('.container');
    if (container) {
        const errorEl = document.createElement('div');
        errorEl.style.cssText = 'background: var(--danger); color: white; padding: 16px; border-radius: 8px; margin: 20px 0;';
        errorEl.textContent = message;
        container.insertBefore(errorEl, container.firstChild);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadData();
});

