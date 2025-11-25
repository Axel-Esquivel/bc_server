import { All, Controller, NotFoundException } from '@nestjs/common';

@Controller()
export class NotFoundController {
  @All('*')
  handleNotFound() {
    throw new NotFoundException('Route not found');
  }
}
