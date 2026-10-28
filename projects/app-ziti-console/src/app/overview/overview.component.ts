import {Component, OnDestroy, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';

interface StatCard {
  key: string;
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'danger' | 'green' | 'cyan' | 'violet';
}

interface RouterRow {
  name: string;
  online: boolean;
  cost: number;
  version: string;
}

interface SessionRow {
  id: string;
  service: string;
  identity: string;
  type: string;
  created: string;
}

/**
 * 概览页（CloakMesh 新增）
 *
 * 只读聚合，不改动任何既有功能模块：通过 ZAC 反向代理拿管理 API 的统计与列表，
 * 按 KingMoat 控制台的「统计卡 + 面板」版式展示。
 */
@Component({
  selector: 'app-overview',
  standalone: false,
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  stats: StatCard[] = [];
  routers: RouterRow[] = [];
  sessions: SessionRow[] = [];
  lastUpdated = '';

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly base = '/edge/management/v1';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 30000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  refresh(): void {
    this.loading = true;
    this.error = '';

    const count = (path: string) =>
      this.http.get<any>(`${this.base}/${path}?limit=1`).toPromise()
        .then((r) => Number(r?.meta?.pagination?.totalCount ?? 0))
        .catch(() => -1);

    Promise.all([
      count('identities'),
      count('services'),
      this.http.get<any>(`${this.base}/edge-routers?limit=200`).toPromise().catch(() => null),
      this.http.get<any>(`${this.base}/sessions?limit=8`).toPromise().catch(() => null),
    ]).then(([identities, services, routers, sessions]) => {
      if (identities < 0 && services < 0 && !routers) {
        this.error = '无法读取控制器数据，请确认已登录且控制器在线。';
        this.loading = false;
        return;
      }

      const routerList: RouterRow[] = (routers?.data || []).map((r: any) => ({
        name: r.name,
        online: !!r.isOnline,
        cost: r.cost ?? 0,
        version: r.version || '-',
      }));
      const online = routerList.filter((r) => r.online).length;

      this.stats = [
        {key: 'identities', label: '身份', value: this.fmt(identities), hint: '可接入网络的实体', tone: 'blue'},
        {key: 'services', label: '服务', value: this.fmt(services), hint: '可被访问的应用', tone: 'cyan'},
        {
          key: 'routers',
          label: '边缘路由器',
          value: `${online}/${routerList.length}`,
          hint: online === routerList.length && routerList.length > 0 ? '全部在线' : '有路由器离线',
          tone: online === routerList.length ? 'green' : 'danger',
        },
        {
          key: 'sessions',
          label: '活跃会话',
          value: this.fmt((sessions?.data || []).length),
          hint: '最近返回的会话数（上限 8）',
          tone: 'violet',
        },
      ];

      this.routers = routerList.slice(0, 8);
      this.sessions = (sessions?.data || []).map((s: any) => ({
        id: (s.id || '').slice(0, 12),
        service: s.service?.name || '-',
        identity: s.identity?.name || '-',
        type: s.type || '-',
        created: s.createdAt ? new Date(s.createdAt).toLocaleString('zh-CN') : '-',
      }));

      this.lastUpdated = new Date().toLocaleTimeString('zh-CN');
      this.loading = false;
    });
  }

  private fmt(n: number): string {
    return n < 0 ? '-' : n.toLocaleString('zh-CN');
  }
}
