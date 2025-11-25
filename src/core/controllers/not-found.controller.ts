import { All, Controller, NotFoundException } from '@nestjs/common';

@Controller()
export class NotFoundController {
  @All('*path')
  handleNotFound() {
    throw new NotFoundException('Route not found');
  }
}
