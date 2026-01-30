import { Home } from "lucide-react";
import { useConnectionStore } from "@/stores/connectionStore";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function BreadcrumbNav() {
  const { activeBucket, currentPath, navigateToPath } = useConnectionStore();

  const pathParts = currentPath.split("/").filter(Boolean);

  const handleNavigate = (index: number) => {
    if (index === -1) {
      navigateToPath("");
    } else {
      const newPath = pathParts.slice(0, index + 1).join("/") + "/";
      navigateToPath(newPath);
    }
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer flex items-center gap-1"
            onClick={() => handleNavigate(-1)}
          >
            <Home className="h-4 w-4" />
            {activeBucket}
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathParts.map((part, index) => (
          <BreadcrumbItem key={index}>
            <BreadcrumbSeparator />
            {index === pathParts.length - 1 ? (
              <BreadcrumbPage>{part}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={() => handleNavigate(index)}
              >
                {part}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
