import i18next from "i18next";
import DocumentationNavigation from "../main/documentation/DocumentationNavigation";

import ar from "./navigation-i18n/ar";
import en from "./navigation-i18n/en";
import tr from "./navigation-i18n/tr";
import authRoles from "../auth/authRoles";

i18next.addResourceBundle("en", "navigation", en);
i18next.addResourceBundle("tr", "navigation", tr);
i18next.addResourceBundle("ar", "navigation", ar);

const navigationConfig = [
  {
    id: "dashboards",
    title: "Dashboards",
    subtitle: "",
    type: "group",
    icon: "heroicons-outline:home",
    translate: "DASHBOARDS",
    children: [
      {
        id: "dashboards.project",
        title: "Dashboard",
        type: "item",
        icon: "heroicons-outline:clipboard-check",
        url: "/dashboards/project",
      },
    ],
  },
  {
    id: "apps",
    title: "Applications",
    subtitle: "",
    type: "group",
    icon: "heroicons-outline:cube",
    translate: "APPLICATIONS",
    children: [
      {
        id: "apps.tasks",
        title: "Tasks",
        subtitle: "12 remaining tasks",
        type: "item",
        icon: "heroicons-outline:check-circle",
        url: "/apps/tasks",
        translate: "TASKS",
      },
      {
        id: "apps.academy",
        title: "Universities",
        type: "item",
        icon: "heroicons-outline:academic-cap",
        url: "/apps/academy",
        translate: "UNIVERSITY",
      },
      {
        id: "apps.calendar",
        title: "Calendar",
        subtitle: "3 upcoming events",
        type: "item",
        icon: "heroicons-outline:calendar",
        url: "/apps/calendar",
        translate: "CALENDAR",
      },
      {
        id: "apps.chat",
        title: "Chat",
        type: "item",
        icon: "heroicons-outline:chat-alt",
        url: "/apps/chat",
        translate: "CHAT",
      },
      {
        id: "apps.file-manager",
        title: "File Manager",
        type: "item",
        icon: "heroicons-outline:cloud",
        url: "/apps/file-manager",
        end: true,
        translate: "FILE_MANAGER",
      },
      {
        id: "apps.help-center",
        title: "Help Center",
        type: "collapse",
        icon: "heroicons-outline:support",
        url: "/apps/help-center",
        children: [
          {
            id: "apps.help-center.home",
            title: "Home",
            type: "item",
            url: "/apps/help-center",
            end: true,
          },
          {
            id: "apps.help-center.faqs",
            title: "FAQs",
            type: "item",
            url: "/apps/help-center/faqs",
          },
          {
            id: "apps.help-center.guides",
            title: "Guides",
            type: "item",
            url: "/apps/help-center/guides",
          },
          {
            id: "apps.help-center.support",
            title: "Support",
            type: "item",
            url: "/apps/help-center/support",
          },
        ],
      },
    ],
  },
];

export default navigationConfig;
