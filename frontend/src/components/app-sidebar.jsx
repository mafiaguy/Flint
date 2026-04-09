import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronsUpDownIcon, LogOutIcon, UserIcon, SettingsIcon, ZapIcon, SearchIcon, KanbanIcon } from 'lucide-react';
import useStore from '@/store';

const NAV_ITEMS = [
  { path: '/matches', label: 'Matches', icon: ZapIcon },
  { path: '/browse', label: 'Browse', icon: SearchIcon },
  { path: '/tracker', label: 'Tracker', icon: KanbanIcon },
  { path: '/profile', label: 'Profile', icon: UserIcon },
];

export function AppSidebar(props) {
  const { profile, signOut } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname.startsWith('/job/') ? '/matches' : location.pathname;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => navigate('/matches')} className="cursor-pointer">
              <div className="bg-foreground text-background flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-black">
                f
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">flint</span>
                <span className="truncate text-xs text-muted-foreground">job search agent</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="px-2 pt-2">
          {NAV_ITEMS.map((item) => {
            const active = activePath === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  onClick={() => navigate(item.path)}
                  isActive={active}
                  className="cursor-pointer"
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <SidebarMenuButton size="lg" className="aria-expanded:bg-muted cursor-pointer" />
              }>
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
                  <AvatarFallback className="rounded-lg">{(profile?.name || 'U')[0]}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{profile?.name || 'User'}</span>
                  <span className="truncate text-xs text-muted-foreground">{profile?.email || ''}</span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56 rounded-lg" side="right" align="end" sideOffset={4}>
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <UserIcon />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/onboarding')} className="cursor-pointer">
                  <SettingsIcon />
                  Edit preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate('/'); }} className="cursor-pointer">
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
