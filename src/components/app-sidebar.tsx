import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, GraduationCap, ChevronDown } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchDisplaySettings, getCachedDisplaySettings } from "@/lib/display-settings";
import { getMyMenuLayout } from "@/lib/menu-layout.functions";
import { getMyProfile } from "@/lib/me.functions";
import { resolveLayout, type ResolvedGroup, type ResolvedNode } from "@/lib/sidebar-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  const navigate = useNavigate();
  const { data: d = getCachedDisplaySettings() } = useQuery({
    queryKey: ["display-settings"],
    queryFn: fetchDisplaySettings,
    initialData: getCachedDisplaySettings,
    staleTime: 5 * 60_000,
  });

  const getLayout = useServerFn(getMyMenuLayout);
  const { data: layoutRes } = useQuery({
    queryKey: ["sidebar-layout"],
    queryFn: () => getLayout(),
    staleTime: 60_000,
  });
  const getProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
    staleTime: 60_000,
  });
  const nodes: ResolvedNode[] = resolveLayout(layoutRes?.layout ?? null).filter(
    (n) => !n.hidden,
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          {d.logo_url ? (
            <img src={d.logo_url} alt="logo" className="h-10 w-10 object-contain shrink-0" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
          )}
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="font-bold text-sm truncate">{d.app_name}</div>
              <div className="text-xs opacity-80 truncate">{d.subtitle}</div>
              <div className="text-xs opacity-80 truncate">{d.instansi}</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nodes.map((item) =>
                item.kind === "group" ? (
                  <GroupMenu key={item.id} item={item} collapsed={collapsed} isActive={isActive} onNavigate={closeOnMobile} />
                ) : (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} onClick={closeOnMobile} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {profile && (
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold uppercase">
                {(profile.full_name || profile.email || "?").trim().charAt(0)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="leading-tight min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">
                  {profile.full_name || "Pengguna"}
                </div>
                {profile.email && (
                  <div className="text-xs opacity-80 truncate">{profile.email}</div>
                )}
                {profile.role && (
                  <div className="text-xs opacity-70 capitalize truncate">
                    {profile.role.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Keluar</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function GroupMenu({
  item,
  collapsed,
  isActive,
  onNavigate,
}: {
  item: ResolvedGroup;
  collapsed: boolean;
  isActive: (url: string) => boolean;
  onNavigate?: () => void;
}) {
  const visibleChildren = item.children.filter((c) => !c.hidden);
  const anyActive = visibleChildren.some((c) => isActive(c.url));
  const [open, setOpen] = useState(anyActive);

  if (visibleChildren.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={anyActive} className="w-full">
            <item.icon className="h-4 w-4" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </>
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {!collapsed && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {visibleChildren.map((c) => (
                <SidebarMenuSubItem key={c.id}>
                  <SidebarMenuSubButton asChild isActive={isActive(c.url)}>
                    <Link to={c.url} onClick={onNavigate} className="flex items-center gap-2">
                      <c.icon className="h-3.5 w-3.5" />
                      <span>{c.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}
