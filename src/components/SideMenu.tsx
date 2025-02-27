
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Home, Phone, Video, List, Plus, PhoneOutgoing, PhoneIncoming, UserPlus, Users } from "lucide-react";

const SideMenu = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Users, label: "List Agents", path: "/agents" },
    { icon: UserPlus, label: "Create Agent", path: "/create-agent" },
    { icon: Phone, label: "Create Phone Call", path: "/create-call" },
    { icon: Video, label: "Create Web Call", path: "/create-web-call" },
    { icon: Plus, label: "Create Batch Call", path: "/create-batch-call" },
    { icon: PhoneOutgoing, label: "Create Phone Number", path: "/create-phone-number" },
    { icon: PhoneIncoming, label: "Import Phone Number", path: "/import-phone-number" },
    { icon: List, label: "Call History", path: "/calls" },
  ];

  // Close menu when route changes
  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Retell Dashboard
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-8">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start gap-2"
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default SideMenu;
